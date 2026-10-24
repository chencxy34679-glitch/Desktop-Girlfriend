package com.cxy.desktopgf.module.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxy.desktopgf.module.auth.entity.UserAccount;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Optional;

/**
 * 用户账号 Mapper。
 *
 * <p>全部使用注解写 SQL，不引入 XML 映射文件。
 */
// @Mapper 由 @MapperScan 统一扫描,此处不再重复标注
public interface UserAccountMapper extends BaseMapper<UserAccount> {

    /**
     * 按用户名查询账号。
     *
     * @param username 用户名
     * @return 账号，不存在返回空
     */
    @Select("SELECT id, username, email, password_hash, display_name, avatar_url, status, user_type, "
            + "created_at, updated_at, deleted FROM user_account "
            + "WHERE username = #{username} AND deleted = 0 LIMIT 1")
    Optional<UserAccount> findByUsername(@Param("username") String username);

    /**
     * 按设备 ID 反查所属账号（关联 user_device 表）。
     *
     * <p>用于匿名用户「免注册找回身份」。
     *
     * @param deviceId 设备唯一标识
     * @return 账号，不存在返回空
     */
    @Select("SELECT ua.id, ua.username, ua.email, ua.password_hash, ua.display_name, ua.avatar_url, "
            + "ua.status, ua.user_type, ua.created_at, ua.updated_at, ua.deleted "
            + "FROM user_account ua "
            + "INNER JOIN user_device ud ON ud.user_id = ua.id "
            + "WHERE ud.device_id = #{deviceId} AND ua.deleted = 0 "
            + "LIMIT 1")
    Optional<UserAccount> findByDeviceId(@Param("deviceId") String deviceId);

    /**
     * 按邮箱查询账号。
     *
     * @param email 邮箱
     * @return 账号，不存在返回空
     */
    @Select("SELECT id, username, email, password_hash, display_name, avatar_url, status, user_type, "
            + "created_at, updated_at, deleted FROM user_account "
            + "WHERE email = #{email} AND deleted = 0 LIMIT 1")
    Optional<UserAccount> findByEmail(@Param("email") String email);

    /**
     * 统计用户名占用数量，用于注册时的重名校验。
     *
     * @param username 用户名
     * @return 占用数量，0 表示可注册
     */
    @Select("SELECT COUNT(*) FROM user_account WHERE username = #{username} AND deleted = 0")
    int countByUsername(@Param("username") String username);
}
