package com.cxy.desktopgf.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serializable;

/**
 * 刷新令牌请求：用 refresh token 换取一对新 token。
 */
@Data
public class RefreshTokenRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 刷新令牌 */
    @NotBlank(message = "refreshToken 不能为空")
    private String refreshToken;
}
