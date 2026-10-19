package com.cxy.desktopgf.module.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.io.Serializable;

/**
 * 匿名升级为注册用户的请求。
 *
 * <p>需要携带匿名阶段拿到的 Bearer token 以确定要升级哪个账号。
 */
@Data
public class UpgradeRegisterRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 用户名，3-30 个字符 */
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 30, message = "用户名长度需在 3-30 个字符之间")
    private String username;

    /** 密码，8-64 个字符（明文，服务端只存 BCrypt 哈希） */
    @NotBlank(message = "密码不能为空")
    @Size(min = 8, max = 64, message = "密码长度需在 8-64 个字符之间")
    private String password;

    /** 邮箱，可选 */
    @Email(message = "邮箱格式不正确")
    @Size(max = 128, message = "邮箱长度不能超过 128")
    private String email;
}
