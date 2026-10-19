package com.cxy.desktopgf.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.io.Serializable;

/**
 * 匿名注册请求（桌面端首次启动时调用）。
 */
@Data
public class AnonymousRegisterRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 客户端生成的设备唯一标识（UUID），必填 */
    @NotBlank(message = "deviceId 不能为空")
    @Size(max = 64, message = "deviceId 长度不能超过 64")
    private String deviceId;

    /** 设备名称，可选 */
    @Size(max = 128, message = "deviceName 长度不能超过 128")
    private String deviceName;

    /** 操作系统版本，可选 */
    @Size(max = 32, message = "osVersion 长度不能超过 32")
    private String osVersion;

    /** 客户端版本，可选 */
    @Size(max = 32, message = "appVersion 长度不能超过 32")
    private String appVersion;
}
