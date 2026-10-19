package com.cxy.desktopgf.module.auth.web;

import com.cxy.desktopgf.auth.AuthContext;
import com.cxy.desktopgf.common.BizException;
import com.cxy.desktopgf.common.ErrorCode;
import com.cxy.desktopgf.common.Result;
import com.cxy.desktopgf.module.auth.dto.AnonymousRegisterRequest;
import com.cxy.desktopgf.module.auth.dto.AuthResponse;
import com.cxy.desktopgf.module.auth.dto.LoginRequest;
import com.cxy.desktopgf.module.auth.dto.RefreshTokenRequest;
import com.cxy.desktopgf.module.auth.dto.UpgradeRegisterRequest;
import com.cxy.desktopgf.module.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口。
 *
 * <p>全部返回 {@code HTTP 200}，业务结果由响应体中的 {@code code} 判定
 * （0 成功，非 0 为对应错误码），便于桌面端统一处理。
 */
@Slf4j
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 匿名注册。桌面端首次启动调用，携带本机生成的 deviceId。
     *
     * <p>同一 deviceId 重复调用不会创建新账号，只会换发 token。
     */
    @PostMapping("/anonymous")
    public Result<AuthResponse> anonymous(@Valid @RequestBody AnonymousRegisterRequest req) {
        return Result.ok(authService.anonymousRegister(req));
    }

    /**
     * 匿名升级为注册用户。
     *
     * <p>需携带 {@code Authorization: Bearer <accessToken>}，用户 ID 由 {@link AuthContext} 解析。
     */
    @PostMapping("/register")
    public Result<AuthResponse> register(@Valid @RequestBody UpgradeRegisterRequest req) {
        Long userId = AuthContext.getUserId();
        if (userId == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        return Result.ok(authService.upgradeRegister(userId, req));
    }

    /**
     * 注册用户登录。
     */
    @PostMapping("/login")
    public Result<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return Result.ok(authService.login(req));
    }

    /**
     * 用 refresh token 换取新的 access token。
     */
    @PostMapping("/refresh")
    public Result<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return Result.ok(authService.refresh(req.getRefreshToken()));
    }
}
