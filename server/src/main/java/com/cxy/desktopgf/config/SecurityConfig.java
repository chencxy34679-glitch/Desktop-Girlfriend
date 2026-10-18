package com.cxy.desktopgf.config;

import com.cxy.desktopgf.common.BizException;
import com.cxy.desktopgf.common.ErrorCode;
import com.cxy.desktopgf.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Spring Security 配置。
 * <p>
 * 通过 {@link SecurityFilterChain} 注册:
 * <ul>
 *     <li>禁用 CSRF — 纯 API,前后端分离,避免开发期误用</li>
 *     <li>无状态 Session — 完全依赖 JWT</li>
 *     <li>放行健康检查 / 登录注册 / 公开接口 / springdoc</li>
 *     <li>其它路径要求 JWT 合法,通过 {@link JwtAuthenticationFilter} 解析</li>
 * </ul>
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper;

    /**
     * 密码编码器。
     * <p>
     * 使用 BCrypt(强度 10),兼容 Spring Security 与项目内统一签名存储。
     * </p>
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * 主过滤器链。
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/v1/health",
                                "/v1/auth/**",
                                "/v1/license/list",
                                "/v1/update/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/swagger-resources/**",
                                "/webjars/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint((req, resp, ex) -> writeError(resp,
                                HttpStatus.UNAUTHORIZED, "未登录或登录已过期"))
                        .accessDeniedHandler((req, resp, ex) -> writeError(resp,
                                HttpStatus.FORBIDDEN, "无权访问该资源"))
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtUtil, objectMapper),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * 将鉴权失败以统一 JSON 格式响应。
     */
    private void writeError(HttpServletResponse response, HttpStatus status, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        Map<String, Object> body = Map.of(
                "code", status.value(),
                "message", message,
                "timestamp", System.currentTimeMillis()
        );
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /**
     * JWT 解析 Filter,运行在 {@link UsernamePasswordAuthenticationFilter} 之前。
     * <p>
     * 解析成功后将用户 ID 写入 SecurityContext,失败/缺失则直接交给后续鉴权入口返回 401。
     * </p>
     */
    @RequiredArgsConstructor
    public static class JwtAuthenticationFilter extends OncePerRequestFilter {

        private final JwtUtil jwtUtil;
        private final ObjectMapper objectMapper;

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        HttpServletResponse response,
                                        FilterChain filterChain) throws ServletException, IOException {
            String token = resolveBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION));
            if (!StringUtils.hasText(token)) {
                filterChain.doFilter(request, response);
                return;
            }
            try {
                Claims claims = jwtUtil.parseToken(token);
                Long userId = JwtUtil.extractUserId(claims);
                if (userId != null) {
                    // 直接以 userId 作为 principal,无凭证信息;
                    // 业务层通过 SecurityContextHolder.getContext().getAuthentication().getPrincipal() 获取。
                    List<SimpleGrantedAuthority> authorities =
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userId, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException ex) {
                log.warn("JWT 解析失败, uri={}, message={}", request.getRequestURI(), ex.getMessage());
                writeError(response, HttpStatus.UNAUTHORIZED, "登录已过期,请重新登录");
                return;
            } catch (BizException ex) {
                writeError(response, HttpStatus.UNAUTHORIZED, ex.getMessage());
                return;
            } catch (RuntimeException ex) {
                log.error("JWT 过滤器异常, uri={}", request.getRequestURI(), ex);
                writeError(response, HttpStatus.UNAUTHORIZED, "认证失败");
                return;
            }
            filterChain.doFilter(request, response);
        }

        private void writeError(HttpServletResponse response, HttpStatus status, String message)
                throws IOException {
            response.setStatus(status.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            Map<String, Object> body = Map.of(
                    "code", ErrorCode.UNAUTHORIZED,
                    "message", message,
                    "timestamp", System.currentTimeMillis()
            );
            response.getWriter().write(objectMapper.writeValueAsString(body));
        }
    }

    /**
     * 解析 Bearer token。
     */
    private static String resolveBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }
        if (!authorizationHeader.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return null;
        }
        return authorizationHeader.substring(BEARER_PREFIX.length()).trim();
    }
}
