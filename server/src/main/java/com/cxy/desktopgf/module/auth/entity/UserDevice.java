package com.cxy.desktopgf.module.auth.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户设备实体，对应 {@code user_device} 表。
 *
 * <p>{@code deviceId} 由桌面端首次启动时生成并持久化到本地，是匿名用户「免注册找回身份」的唯一凭据。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("user_device")
public class UserDevice {

    /** 主键，雪花 ID */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 所属用户 ID */
    @TableField("user_id")
    private Long userId;

    /** 客户端生成的设备唯一标识（UUID），全局唯一 */
    @TableField("device_id")
    private String deviceId;

    /** 设备名称 */
    @TableField("device_name")
    private String deviceName;

    /** 操作系统版本 */
    @TableField("os_version")
    private String osVersion;

    /** 客户端版本 */
    @TableField("app_version")
    private String appVersion;

    /** 最后活跃时间，每次登录 / 匿名注册时刷新 */
    @TableField("last_active_at")
    private LocalDateTime lastActiveAt;

    /** 创建时间，插入时自动填充 */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
