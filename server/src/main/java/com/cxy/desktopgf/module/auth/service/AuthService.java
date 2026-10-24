package com.cxy.desktopgf.module.auth.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cxy.desktopgf.common.BizException;
import com.cxy.desktopgf.common.ErrorCode;
import com.cxy.desktopgf.module.auth.dto.AnonymousRegisterRequest;
import com.cxy.desktopgf.module.auth.dto.AuthResponse;
import com.cxy.desktopgf.module.auth.dto.LoginRequest;
import com.cxy.desktopgf.module.auth.dto.UpgradeRegisterRequest;
import com.cxy.desktopgf.module.auth.entity.UserAccount;
import com.cxy.desktopgf.module.auth.entity.UserDevice;
import com.cxy.desktopgf.module.auth.mapper.UserAccountMapper;
import com.cxy.desktopgf.module.auth.mapper.UserDeviceMapper;
import com.cxy.desktopgf.util.IdGenerator;
import com.cxy.desktopgf.util.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * 认证服务。
 *
 * <p>覆盖 M1 的四条主链路：匿名注册、匿名升级注册、账号登录、token 刷新。
 *
 * <p>设计要点：
 * <ul>
 *     <li>匿名身份以 deviceId 为锚点，桌面端无需用户输入即可获得账号</li>
 *     <li>密码一律经 BCrypt 单向哈希存储，任何路径都不会返回密码字段</li>
 *     <li>登录失败（用户不存在 / 密码错误 / 账号停用）统一返回 INVALID_CREDENTIALS，
 *         避免通过错误码枚举系统中的用户名</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserAccountMapper userAccountMapper;

    private final UserDeviceMapper userDeviceMapper;

    private final JwtUtil jwtUtil;

    private final PasswordEncoder passwordEncoder;

    private final IdGenerator idGenerator;

    /**
     * 匿名注册（桌面端首次启动时调用）。
     *
     * <p>同一 deviceId 重复调用是幂等的：命中已有设备则直接换发 token，不会创建重复账号。
     *
     * @param req 匿名注册请求
     * @return 认证结果，{@code isNewUser} 标识本次是否新建账号
     */
    @Transactional
    public AuthResponse anonymousRegister(AnonymousRegisterRequest req) {
        String deviceId = req.getDeviceId().trim();

        // 1. 该设备是否已经有账号（老用户重装 / 重启桌面端）
        UserDevice existing = userDeviceMapper.findByDeviceId(deviceId).orElse(null);
        if (existing != null) {
            UserAccount account = userAccountMapper.selectById(existing.getUserId());
            if (account != null) {
                touchDevice(existing, req);
                log.info("匿名注册命中已有设备 deviceId={} userId={}，返回既有身份",
                        deviceId, account.getId());
                return buildResponse(account, false);
            }
            // 设备记录存在但账号已被逻辑删除，按新用户处理并重建绑定
            log.warn("设备 deviceId={} 绑定的账号已不存在，重新创建匿名账号", deviceId);
        }

        // 2. 创建匿名账号：username / email / passwordHash 均为 null
        UserAccount account = UserAccount.builder()
                .id(idGenerator.nextId())
                .userType(UserAccount.TYPE_ANONYMOUS)
                .status(UserAccount.STATUS_ACTIVE)
                .displayName(StringUtils.hasText(req.getDeviceName()) ? req.getDeviceName().trim() : null)
                .build();
        userAccountMapper.insert(account);

        // 3. 绑定设备
        UserDevice device = UserDevice.builder()
                .id(idGenerator.nextId())
                .userId(account.getId())
                .deviceId(deviceId)
                .deviceName(req.getDeviceName())
                .osVersion(req.getOsVersion())
                .appVersion(req.getAppVersion())
                .lastActiveAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        userDeviceMapper.upsert(device);

        log.info("创建匿名账号 userId={} deviceId={}", account.getId(), deviceId);
        return buildResponse(account, true);
    }

    /**
     * 匿名用户升级为注册用户。
     *
     * <p>用户 ID 来自请求携带的匿名 access token，因此无需额外传参。
     *
     * @param userId 匿名用户 ID
     * @param req    注册信息
     * @return 认证结果（换发了新的 token）
     */
    @Transactional
    public AuthResponse upgradeRegister(Long userId, UpgradeRegisterRequest req) {
        UserAccount account = userAccountMapper.selectById(userId);
        if (account == null) {
            throw new BizException(ErrorCode.USER_NOT_FOUND);
        }
        if (!UserAccount.TYPE_ANONYMOUS.equals(account.getUserType())) {
            throw new BizException(ErrorCode.BAD_REQUEST, "该账号已完成注册，请直接登录");
        }

        String username = req.getUsername().trim();
        if (userAccountMapper.countByUsername(username) > 0) {
            throw new BizException(ErrorCode.USER_ALREADY_EXISTS, "用户名已被占用");
        }

        String email = StringUtils.hasText(req.getEmail()) ? req.getEmail().trim() : null;
        if (email != null && userAccountMapper.findByEmail(email).isPresent()) {
            throw new BizException(ErrorCode.USER_ALREADY_EXISTS, "邮箱已被占用");
        }

        account.setUsername(username);
        // 只存 BCrypt 哈希，明文密码不落库、不入日志
        account.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        account.setEmail(email);
        account.setUserType(UserAccount.TYPE_REGISTERED);
        if (!StringUtils.hasText(account.getDisplayName())) {
            account.setDisplayName(username);
        }
        userAccountMapper.updateById(account);

        log.info("匿名用户升级为注册用户 userId={} username={}", account.getId(), username);
        return buildResponse(account, false);
    }

    /**
     * 注册用户登录。
     *
     * @param req 登录请求
     * @return 认证结果
     */
    public AuthResponse login(LoginRequest req) {
        String username = req.getUsername().trim();
        UserAccount account = userAccountMapper.findByUsername(username)
                // 用户不存在与密码错误返回同一个错误码，避免用户名枚举
                .orElseThrow(() -> new BizException(ErrorCode.INVALID_CREDENTIALS));

        // 匿名账号没有密码哈希，同样按凭证错误处理
        if (!StringUtils.hasText(account.getPasswordHash())
                || !passwordEncoder.matches(req.getPassword(), account.getPasswordHash())) {
            throw new BizException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!UserAccount.STATUS_ACTIVE.equals(account.getStatus())) {
            throw new BizException(ErrorCode.INVALID_CREDENTIALS, "账号已被禁用，请联系客服");
        }

        // 记录本次登录落在哪台设备上
        touchLastActiveDevice(account.getId());

        log.info("用户登录成功 userId={} username={}", account.getId(), username);
        return buildResponse(account, false);
    }

    /**
     * 用 refresh token 换取一对新 token。
     *
     * <p>只接受 refresh token：拿 access token 来续期会被拒绝。
     *
     * @param refreshToken 刷新令牌
     * @return 认证结果
     */
    public AuthResponse refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwtUtil.parseToken(refreshToken);
        } catch (BizException e) {
            // 已过期保留 TOKEN_EXPIRED 语义，其余解析失败统一按「刷新凭证无效」处理
            if (e.getCode() == ErrorCode.TOKEN_EXPIRED.getCode()) {
                throw e;
            }
            throw new BizException(ErrorCode.REFRESH_TOKEN_INVALID);
        }
        // 类型校验：access token 不能用于续期
        jwtUtil.requireType(claims, JwtUtil.TYPE_REFRESH);

        Long userId = jwtUtil.extractUserId(claims);
        UserAccount account = userAccountMapper.selectById(userId);
        if (account == null) {
            throw new BizException(ErrorCode.USER_NOT_FOUND);
        }
        if (!UserAccount.STATUS_ACTIVE.equals(account.getStatus())) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "账号已被禁用，请联系客服");
        }

        log.info("刷新 token 成功 userId={}", account.getId());
        return buildResponse(account, false);
    }

    /**
     * 组装认证响应并签发 token。
     *
     * @param account   用户账号
     * @param isNewUser 是否为本次新建的账号
     */
    private AuthResponse buildResponse(UserAccount account, boolean isNewUser) {
        String accessToken = jwtUtil.createAccessToken(account.getId());
        String refreshToken = jwtUtil.createRefreshToken(account.getId());
        return AuthResponse.builder()
                .userId(account.getId())
                .username(account.getUsername())
                .email(account.getEmail())
                .displayName(account.getDisplayName())
                .avatarUrl(account.getAvatarUrl())
                .userType(account.getUserType())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .accessTokenExpiresAt(jwtUtil.accessTokenExpiresAt())
                .refreshTokenExpiresAt(jwtUtil.refreshTokenExpiresAt())
                .isNewUser(isNewUser)
                .build();
    }

    /**
     * 刷新已有设备记录的最后活跃时间与设备信息。
     */
    private void touchDevice(UserDevice existing, AnonymousRegisterRequest req) {
        userDeviceMapper.upsert(UserDevice.builder()
                .id(existing.getId())
                .userId(existing.getUserId())
                .deviceId(existing.getDeviceId())
                // 未上报的字段保留原值，避免被 null 覆盖
                .deviceName(StringUtils.hasText(req.getDeviceName()) ? req.getDeviceName() : existing.getDeviceName())
                .osVersion(StringUtils.hasText(req.getOsVersion()) ? req.getOsVersion() : existing.getOsVersion())
                .appVersion(StringUtils.hasText(req.getAppVersion()) ? req.getAppVersion() : existing.getAppVersion())
                .lastActiveAt(LocalDateTime.now())
                .createdAt(existing.getCreatedAt())
                .build());
    }

    /**
     * 登录成功后，把该用户最近使用的设备标记为当前活跃。
     */
    private void touchLastActiveDevice(Long userId) {
        UserDevice latest = userDeviceMapper.selectOne(new LambdaQueryWrapper<UserDevice>()
                .eq(UserDevice::getUserId, userId)
                .orderByDesc(UserDevice::getLastActiveAt)
                .last("LIMIT 1"));
        if (latest == null) {
            return;
        }
        latest.setLastActiveAt(LocalDateTime.now());
        userDeviceMapper.updateById(latest);
    }
}
