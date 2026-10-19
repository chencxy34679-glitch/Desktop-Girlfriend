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

    /** claims 中存放令牌类型的 key。 */
    public static final String CLAIM_TYPE = "typ";

    /** 访问令牌类型值。 */
    public static final String TYPE_ACCESS = "access";

    /** 刷新令牌类型值。 */
    public static final String TYPE_REFRESH = "refresh";

    /**
     * 编译期 SecretKey 缓存,避免每次签名都重新构造。
     */
    private SecretKey secretKey;

    public JwtUtil() {
    }

    /**
     * 供单元测试直接构造使用;生产环境走 Spring 的 {@code @Value} 注入 + 无参构造。
     *
     * @param secret          HMAC 密钥,长度必须 >= 32 字节
     * @param accessTokenTtl  access token 有效期(秒)
     * @param refreshTokenTtl refresh token 有效期(秒)
     */
    public JwtUtil(String secret, long accessTokenTtl, long refreshTokenTtl) {
        this.secret = secret;
        this.accessTokenTtl = accessTokenTtl;
        this.refreshTokenTtl = refreshTokenTtl;
        this.init();
    }

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
        return createToken(userId, accessTokenTtl, TYPE_ACCESS);
    }

    /**
     * 创建刷新令牌(refresh token)。
     *
     * @param userId 用户 ID,作为 {@code sub} claim
     * @return 签名后的 JWT 字符串
     */
    public String createRefreshToken(Long userId) {
        return createToken(userId, refreshTokenTtl, TYPE_REFRESH);
    }

    /**
     * 通用令牌创建方法。
     * <p>
     * 令牌内写入 {@code type} claim(access / refresh),用于防止 access token
     * 被误用于续期接口。refresh token 有效期更长、权限更窄,两者必须严格区分。
     * </p>
     *
     * @param userId  用户 ID
     * @param ttlSec  有效期(秒)
     * @param type    令牌类型({@link #TYPE_ACCESS} 或 {@link #TYPE_REFRESH})
     * @return 签名后的 JWT 字符串
     */
    private String createToken(Long userId, long ttlSec, String type) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuer(ISSUER)
                .claim(CLAIM_TYPE, type)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlSec * 1000L))
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * 校验 claims 中的 {@code type} claim 是否符合预期。
     * <p>
     * 用于阻断"用 access token 调续期接口"这类越权尝试。
     * </p>
     *
     * @param claims     解析后的 claims
     * @param expectType 期望的令牌类型
     * @throws com.cxy.desktopgf.common.BizException 类型不匹配时抛出(REFRESH_TOKEN_INVALID)
     */
    public void requireType(Claims claims, String expectType) {
        String actual = claims == null ? null : claims.get(CLAIM_TYPE, String.class);
        if (!expectType.equals(actual)) {
            throw new com.cxy.desktopgf.common.BizException(
                    com.cxy.desktopgf.common.ErrorCode.REFRESH_TOKEN_INVALID,
                    "令牌类型不匹配,expected=" + expectType);
        }
    }

    /**
     * 判断 claims 中的令牌类型是否为指定值,不抛异常。
     *
     * @param claims     解析后的 claims
     * @param expectType 期望的令牌类型
     * @return 类型匹配返回 {@code true}
     */
    public boolean isType(Claims claims, String expectType) {
        String actual = claims == null ? null : claims.get(CLAIM_TYPE, String.class);
        return expectType.equals(actual);
    }

    /**
     * access token 的过期时间戳。
     *
     * @return epoch 毫秒
     */
    public long accessTokenExpiresAt() {
        return System.currentTimeMillis() + accessTokenTtl * 1000L;
    }

    /**
     * refresh token 的过期时间戳。
     *
     * @return epoch 毫秒
     */
    public long refreshTokenExpiresAt() {
        return System.currentTimeMillis() + refreshTokenTtl * 1000L;
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

    /**
     * 一步解析 token 并取出用户 ID。
     * <p>
     * 解析失败(签名错误 / 过期 / 格式非法)会抛 {@link JwtException},
     * 调用方需要捕获并转换为 401 或业务异常。
     * </p>
     *
     * @param token JWT 字符串
     * @return 用户 ID
     * @throws JwtException token 非法或已过期
     */
    public Long extractUserId(String token) {
        return extractUserId(parseToken(token));
    }
}
