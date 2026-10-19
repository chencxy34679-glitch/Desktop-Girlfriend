package com.cxy.desktopgf.module.auth.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户账号实体，对应 {@code user_account} 表。
 *
 * <p>账号有两种形态：
 * <ul>
 *     <li>{@code anonymous} —— 首次启动桌面端时按 deviceId 自动创建，username / email / password 均为 null</li>
 *     <li>{@code registered} —— 用户补全用户名密码后升级而来</li>
 * </ul>
 * 两种形态共用同一张表与同一套 token 机制，前端无感知。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("user_account")
public class UserAccount {

    /** 主键，雪花 ID */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 用户名，匿名用户为 null */
    private String username;

    /** 邮箱，可选 */
    private String email;

    /** BCrypt 密码哈希，匿名用户为 null；绝不出现在任何响应里 */
    @TableField("password_hash")
    private String passwordHash;

    /** 昵称 */
    @TableField("display_name")
    private String displayName;

    /** 头像地址 */
    @TableField("avatar_url")
    private String avatarUrl;

    /** 账号状态：active / disabled */
    private String status;

    /** 账号类型：anonymous / registered */
    @TableField("user_type")
    private String userType;

    /** 创建时间，插入时自动填充 */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间，插入与更新时自动填充 */
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /** 逻辑删除标记：0 未删除，1 已删除 */
    @TableLogic
    @TableField("deleted")
    private Integer deleted;

    /** 账号类型常量：匿名 */
    public static final String TYPE_ANONYMOUS = "anonymous";

    /** 账号类型常量：已注册 */
    public static final String TYPE_REGISTERED = "registered";

    /** 账号状态常量：正常 */
    public static final String STATUS_ACTIVE = "active";
}
