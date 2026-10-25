package com.cxy.desktopgf.module.auth.dto;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 认证响应，登录 / 注册 / 刷新均返回该结构。
 *
 * <p>出于安全考虑不含任何密码或哈希字段。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 用户 ID（雪花 ID，19 位）。
     *
     * <p>序列化为字符串而非数字：JavaScript 的 Number 只有 53 位有效精度，
     * 直接下发 JSON number 会被前端舍入（2113981380731560000 ← 实际是 ...5618）。
     * 用字符串下发可保证桌面端拿到的 ID 精确无损。
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;

    /** 用户名，匿名用户为 null */
    private String username;

    /** 邮箱 */
    private String email;

    /** 昵称 */
    private String displayName;

    /** 头像地址 */
    private String avatarUrl;

    /** 账号类型：anonymous / registered */
    private String userType;

    /** 访问令牌，放入 Authorization: Bearer &lt;token&gt; */
    private String accessToken;

    /** 刷新令牌，用于换取新的访问令牌 */
    private String refreshToken;

    /** 访问令牌过期时间（epoch 毫秒） */
    private Long accessTokenExpiresAt;

    /** 刷新令牌过期时间（epoch 毫秒） */
    private Long refreshTokenExpiresAt;

    /**
     * 本次请求是否创建了全新账号。
     *
     * <p>前端据此决定是否弹出「完善资料 / 设置用户名」的引导；升级注册与登录均为 false。
     */
    private boolean isNewUser;
}
