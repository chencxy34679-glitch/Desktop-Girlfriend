package com.cxy.desktopgf.module.auth;

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
import com.cxy.desktopgf.module.auth.service.AuthService;
import com.cxy.desktopgf.util.IdGenerator;
import com.cxy.desktopgf.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@link AuthService} 单元测试。
 *
 * <p>不启动 Spring 容器：Mapper 用 Mockito 打桩，密码编码与 JWT 使用真实实现，
 * 保证覆盖到 BCrypt 哈希校验与 access / refresh token 类型隔离这些关键逻辑。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("认证服务单元测试")
class AuthServiceTest {

    /** 测试用 JWT 密钥，长度需 ≥ 32 字节 */
    private static final String TEST_SECRET = "desktop-girlfriend-unit-test-secret-key-0123456789";

    private static final long USER_ID = 1001L;
    private static final long DEVICE_ROW_ID = 2001L;
    private static final String DEVICE_ID = "device-uuid-0001";
    private static final String USERNAME = "nekoshiba";
    private static final String RAW_PASSWORD = "SuperSecret123";
    private static final String DEVICE_NAME = "Gaming-PC";

    @Mock
    private UserAccountMapper userAccountMapper;

    @Mock
    private UserDeviceMapper userDeviceMapper;

    private PasswordEncoder passwordEncoder;

    private JwtUtil jwtUtil;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(10);
        jwtUtil = new JwtUtil(TEST_SECRET, 3600L, 2592000L);
        authService = new AuthService(userAccountMapper, userDeviceMapper, jwtUtil,
                passwordEncoder, new IdGenerator());
    }

    // ==================== 匿名注册 ====================

    @Test
    @DisplayName("匿名注册：新设备创建匿名账号并签发 token")
    void anonymousRegister_createsAccountAndDevice() {
        when(userDeviceMapper.findByDeviceId(DEVICE_ID)).thenReturn(Optional.empty());
        when(userAccountMapper.insert(any(UserAccount.class))).thenReturn(1);
        when(userDeviceMapper.upsert(any(UserDevice.class))).thenReturn(1);

        AuthResponse response = authService.anonymousRegister(anonymousRequest());

        assertNotNull(response.getUserId());
        assertEquals(UserAccount.TYPE_ANONYMOUS, response.getUserType());
        assertTrue(response.isNewUser());
        // 匿名用户不返回用户名
        assertNull(response.getUsername());
        assertNotNull(response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertTrue(response.getAccessTokenExpiresAt() > System.currentTimeMillis());

        ArgumentCaptor<UserDevice> deviceCaptor = ArgumentCaptor.forClass(UserDevice.class);
        verify(userDeviceMapper).upsert(deviceCaptor.capture());
        assertEquals(DEVICE_ID, deviceCaptor.getValue().getDeviceId());
        assertEquals(DEVICE_NAME, deviceCaptor.getValue().getDeviceName());
        assertNotNull(deviceCaptor.getValue().getLastActiveAt());
    }

    @Test
    @DisplayName("匿名注册：同一 deviceId 再次调用不会重复建号")
    void anonymousRegister_existingDevice_returnsSameIdentity() {
        UserDevice existing = UserDevice.builder()
                .id(DEVICE_ROW_ID).userId(USER_ID).deviceId(DEVICE_ID)
                .deviceName(DEVICE_NAME).lastActiveAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now().minusDays(3))
                .build();
        UserAccount account = anonymousAccount();

        when(userDeviceMapper.findByDeviceId(DEVICE_ID)).thenReturn(Optional.of(existing));
        when(userAccountMapper.selectById(USER_ID)).thenReturn(account);

        AuthResponse response = authService.anonymousRegister(anonymousRequest());

        assertEquals(USER_ID, response.getUserId());
        assertFalse(response.isNewUser());
        // 关键：不得重复插入账号
        verify(userAccountMapper, never()).insert(any(UserAccount.class));
        verify(userDeviceMapper).upsert(any(UserDevice.class));
    }

    // ==================== 匿名升级注册 ====================

    @Test
    @DisplayName("匿名升级注册：写入用户名与 BCrypt 密码哈希")
    void upgradeRegister_setsUsernameAndHashedPassword() {
        UserAccount account = anonymousAccount();
        when(userAccountMapper.selectById(USER_ID)).thenReturn(account);
        when(userAccountMapper.countByUsername(USERNAME)).thenReturn(0);
        when(userAccountMapper.updateById(any(UserAccount.class))).thenReturn(1);

        UpgradeRegisterRequest req = new UpgradeRegisterRequest();
        req.setUsername(USERNAME);
        req.setPassword(RAW_PASSWORD);
        req.setEmail("nekoshiba@example.com");

        AuthResponse response = authService.upgradeRegister(USER_ID, req);

        assertEquals(UserAccount.TYPE_REGISTERED, response.getUserType());
        assertEquals(USERNAME, response.getUsername());
        assertEquals(USERNAME, account.getUsername());
        // 明文密码绝不能落库
        assertNotNull(account.getPasswordHash());
        assertFalse(RAW_PASSWORD.equals(account.getPasswordHash()));
        assertTrue(passwordEncoder.matches(RAW_PASSWORD, account.getPasswordHash()));
        // 昵称为空时用用户名兜底
        assertEquals(USERNAME, account.getDisplayName());
    }

    @Test
    @DisplayName("匿名升级注册：用户名被占用时报 USER_ALREADY_EXISTS")
    void upgradeRegister_duplicateUsername_rejected() {
        when(userAccountMapper.selectById(USER_ID)).thenReturn(anonymousAccount());
        when(userAccountMapper.countByUsername(USERNAME)).thenReturn(1);

        UpgradeRegisterRequest req = new UpgradeRegisterRequest();
        req.setUsername(USERNAME);
        req.setPassword(RAW_PASSWORD);

        BizException e = assertThrows(BizException.class, () -> authService.upgradeRegister(USER_ID, req));
        assertEquals(ErrorCode.USER_ALREADY_EXISTS.getCode(), e.getCode());
        verify(userAccountMapper, never()).updateById(any(UserAccount.class));
    }

    // ==================== 登录 ====================

    @Test
    @DisplayName("登录：用户名与密码匹配时签发 token")
    void login_success() {
        UserAccount account = registeredAccount();
        when(userAccountMapper.findByUsername(USERNAME)).thenReturn(Optional.of(account));
        when(userDeviceMapper.selectOne(any())).thenReturn(deviceOfUser());

        LoginRequest req = new LoginRequest();
        req.setUsername(USERNAME);
        req.setPassword(RAW_PASSWORD);

        AuthResponse response = authService.login(req);

        assertEquals(USER_ID, response.getUserId());
        assertEquals(UserAccount.TYPE_REGISTERED, response.getUserType());
        assertFalse(response.isNewUser());
        assertNotNull(response.getAccessToken());
        assertNotNull(response.getRefreshToken());
    }

    @Test
    @DisplayName("登录：密码错误返回 INVALID_CREDENTIALS")
    void login_wrongPassword_rejected() {
        when(userAccountMapper.findByUsername(USERNAME)).thenReturn(Optional.of(registeredAccount()));

        LoginRequest req = new LoginRequest();
        req.setUsername(USERNAME);
        req.setPassword("WrongPassword999");

        BizException e = assertThrows(BizException.class, () -> authService.login(req));
        assertEquals(ErrorCode.INVALID_CREDENTIALS.getCode(), e.getCode());
    }

    @Test
    @DisplayName("登录：用户不存在返回 INVALID_CREDENTIALS（不泄露用户名是否存在）")
    void login_userNotFound_sameErrorCode() {
        when(userAccountMapper.findByUsername(USERNAME)).thenReturn(Optional.empty());

        LoginRequest req = new LoginRequest();
        req.setUsername(USERNAME);
        req.setPassword(RAW_PASSWORD);

        BizException e = assertThrows(BizException.class, () -> authService.login(req));
        assertEquals(ErrorCode.INVALID_CREDENTIALS.getCode(), e.getCode());
    }

    @Test
    @DisplayName("登录：账号被禁用时拒绝登录")
    void login_disabledAccount_rejected() {
        UserAccount account = registeredAccount();
        account.setStatus("disabled");
        when(userAccountMapper.findByUsername(USERNAME)).thenReturn(Optional.of(account));

        LoginRequest req = new LoginRequest();
        req.setUsername(USERNAME);
        req.setPassword(RAW_PASSWORD);

        BizException e = assertThrows(BizException.class, () -> authService.login(req));
        assertEquals(ErrorCode.INVALID_CREDENTIALS.getCode(), e.getCode());
    }

    // ==================== 刷新 token ====================

    @Test
    @DisplayName("刷新：用 refresh token 换到新的 access token")
    void refresh_withRefreshToken_issuesNewTokens() {
        when(userAccountMapper.selectById(USER_ID)).thenReturn(registeredAccount());

        String refreshToken = jwtUtil.createRefreshToken(USER_ID);
        AuthResponse response = authService.refresh(refreshToken);

        assertEquals(USER_ID, response.getUserId());
        assertNotNull(response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertEquals(USER_ID, jwtUtil.extractUserId(response.getAccessToken()));
        // 签发的是 access token，可用于业务接口
        assertTrue(jwtUtil.isType(jwtUtil.parseToken(response.getAccessToken()), JwtUtil.TYPE_ACCESS));
        assertTrue(jwtUtil.isType(jwtUtil.parseToken(response.getRefreshToken()), JwtUtil.TYPE_REFRESH));
    }

    @Test
    @DisplayName("刷新：拿 access token 续期会被拒绝")
    void refresh_withAccessToken_rejected() {
        String accessToken = jwtUtil.createAccessToken(USER_ID);

        BizException e = assertThrows(BizException.class, () -> authService.refresh(accessToken));
        assertEquals(ErrorCode.REFRESH_TOKEN_INVALID.getCode(), e.getCode());
        verify(userAccountMapper, never()).selectById(any());
    }

    @Test
    @DisplayName("刷新：被篡改的 token 返回 REFRESH_TOKEN_INVALID")
    void refresh_tamperedToken_rejected() {
        String tampered = jwtUtil.createRefreshToken(USER_ID) + "tampered";

        BizException e = assertThrows(BizException.class, () -> authService.refresh(tampered));
        assertEquals(ErrorCode.REFRESH_TOKEN_INVALID.getCode(), e.getCode());
    }

    // ==================== 测试夹具 ====================

    private AnonymousRegisterRequest anonymousRequest() {
        AnonymousRegisterRequest req = new AnonymousRegisterRequest();
        req.setDeviceId(DEVICE_ID);
        req.setDeviceName(DEVICE_NAME);
        req.setOsVersion("Windows 11");
        req.setAppVersion("0.1.0");
        return req;
    }

    private UserAccount anonymousAccount() {
        return UserAccount.builder()
                .id(USER_ID)
                .userType(UserAccount.TYPE_ANONYMOUS)
                .status(UserAccount.STATUS_ACTIVE)
                .build();
    }

    private UserAccount registeredAccount() {
        return UserAccount.builder()
                .id(USER_ID)
                .username(USERNAME)
                .email("nekoshiba@example.com")
                .passwordHash(passwordEncoder.encode(RAW_PASSWORD))
                .displayName(USERNAME)
                .userType(UserAccount.TYPE_REGISTERED)
                .status(UserAccount.STATUS_ACTIVE)
                .build();
    }

    private UserDevice deviceOfUser() {
        return UserDevice.builder()
                .id(DEVICE_ROW_ID)
                .userId(USER_ID)
                .deviceId(DEVICE_ID)
                .lastActiveAt(LocalDateTime.now().minusHours(1))
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
    }
}
