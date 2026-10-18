package com.cxy.desktopgf.auth;

import com.cxy.desktopgf.common.BizException;
import com.cxy.desktopgf.common.ErrorCode;
import com.cxy.desktopgf.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * JWT 鉴权拦截器。
 * <p>
 * 仅服务于非 Spring Security Filter 链的场景(例如定时任务 / WebSocket / 内部 API)。
 * 主链路上的鉴权由 {@link com.cxy.desktopgf.config.SecurityConfig} 中的
 * {@code JwtAuthenticationFilter} 负责。
 * </p>
 * <p>
 * 流程:
 * <ol>
 *     <li>从 {@code Authorization: Bearer <token>} 头中取出 JWT</li>
 *     <li>通过 {@link JwtUtil#parseToken(String)} 校验签名与有效期</li>
 *     <li>将 userId 写入 {@link AuthContext}</li>
 *     <li>请求结束时通过 {@code afterCompletion} 清理 ThreadLocal</li>
 * </ol>
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    /**
     * Authorization 头中 token 之前的固定前缀。
     */
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        // 仅拦截被 @RequestMapping 等注解标记的 controller 方法,跳过静态资源
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }
        String token = resolveBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION));
        if (!StringUtils.hasText(token)) {
            throw BizException.fail(ErrorCode.UNAUTHORIZED, "缺少 Authorization 头");
        }
        try {
            Claims claims = jwtUtil.parseToken(token);
            Long userId = JwtUtil.extractUserId(claims);
            if (userId == null) {
                throw BizException.fail(ErrorCode.UNAUTHORIZED, "JWT 主题无效");
            }
            AuthContext.setUserId(userId);
        } catch (JwtException ex) {
            log.warn("AuthInterceptor token 校验失败, uri={}, message={}",
                    request.getRequestURI(), ex.getMessage());
            throw BizException.fail(ErrorCode.UNAUTHORIZED, "登录已过期,请重新登录");
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                 HttpServletResponse response,
                                 Object handler,
                                 Exception ex) {
        // 任何情况下都清理 ThreadLocal,防止线程复用导致的数据串扰
        AuthContext.clear();
    }

    /**
     * 从 Authorization 头解析 Bearer Token。
     */
    private String resolveBearerToken(String authorizationHeader) {
        if (authorizationHeader == null) {
            return null;
        }
        if (!authorizationHeader.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return null;
        }
        return authorizationHeader.substring(BEARER_PREFIX.length()).trim();
    }
}
