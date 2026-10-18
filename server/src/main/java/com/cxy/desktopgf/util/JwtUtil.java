package com.cxy.desktopgf.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具类。
 * <p>
 * 基于 JJWT 0.12.x 实现,使用 HS256 对称加密算法。
 * 通过 {@code @ConfigurationProperties} 绑定 {@code desktop-girlfriend.jwt.*} 配置,
 * 包括密钥、访问令牌 TTL、刷新令牌 TTL 等。
 * </p>
 * <p>
 * JWT 载荷(claims):
 * <ul>
 *     <li>{@code sub} — 用户 ID</li>
 *     <li>{@code iss} — 签发方,固定为 {@code desktop-girlfriend}</li>
 *     <li>{@code iat} — 签发时间(秒)</li>
 *     <li>{@code exp} — 过期时间(秒)</li>
 * </ul>
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Data
@Component
@ConfigurationProperties(prefix = "desktop-girlfriend.jwt")
public class JwtUtil {

    /**
     * HMAC-SHA256 签名密钥,长度必须 >= 32 字节。
     */
    private String secret;

    /**
     * 访问令牌有效期(秒),默认 3600 秒(1 小时)。
     */
    private long accessTokenTtl = 3600L;

    /**
     * 刷新令牌有效期(秒),默认 2592000 秒(30 天)。
     */
    private long refreshTokenTtl = 2592000L;

    /**
     * JWT 签发方标识。
     */
    private static final String ISSUER = "desktop-girlfriend";

    /**
     * 编译期 SecretKey 缓存,避免每次签名都重新构造。
     */
    private SecretKey secretKey;

    /**
     * 初始化签名密钥。密钥不足 32 字节会启动失败,避免运行时签名异常。
     */
    @PostConstruct
    public void init() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("desktop-girlfriend.jwt.secret 未配置");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "desktop-girlfriend.jwt.secret 长度不足 32 字节,当前长度=" + keyBytes.length);
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        log.info("JwtUtil 初始化完成, issuer={}, accessTokenTtl={}s, refreshTokenTtl={}s",
                ISSUER, accessTokenTtl, refreshTokenTtl);
    }

    /**
     * 创建访问令牌(access token)。
     *
     * @param userId 用户 ID,作为 {@code sub} claim
     * @return 签名后的 JWT 字符串
     */
    public String createAccessToken(Long userId) {
        return createToken(userId, accessTokenTtl);
    }

    /**
     * 创建刷新令牌(refresh token)。
     *
     * @param userId 用户 ID,作为 {@code sub} claim
     * @return 签名后的 JWT 字符串
     */
    public String createRefreshToken(Long userId) {
        return createToken(userId, refreshTokenTtl);
    }

    /**
     * 通用令牌创建方法。
     *
     * @param userId  用户 ID
     * @param ttlSec  有效期(秒)
     * @return 签名后的 JWT 字符串
     */
    private String createToken(Long userId, long ttlSec) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuer(ISSUER)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlSec * 1000L))
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * 解析 JWT,校验签名、issuer 与有效期。
     * <p>
     * 任一校验失败都会抛出 {@link JwtException};调用方应捕获并转换为业务异常或返回 401。
     * </p>
     *
     * @param token JWT 字符串
     * @return 解析后的 claims
     * @throws JwtException 签名错误、过期或 issuer 不匹配
     */
    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(ISSUER)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 从已解析的 claims 中提取用户 ID。
     *
     * @param claims 解析后的 JWT claims
     * @return 用户 ID;当 subject 不是合法 Long 时返回 {@code null}
     */
    public static Long extractUserId(Claims claims) {
        if (claims == null) {
            return null;
        }
        String sub = claims.getSubject();
        if (sub == null || sub.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(sub);
        } catch (NumberFormatException ex) {
            log.warn("JwtUtil.extractUserId 无法解析 subject='{}'", sub, ex);
            return null;
        }
    }
}
