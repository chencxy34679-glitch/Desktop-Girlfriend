package com.cxy.desktopgf.module.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cxy.desktopgf.module.auth.entity.UserDevice;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Optional;

/**
 * 用户设备 Mapper。
 */
@Mapper
public interface UserDeviceMapper extends BaseMapper<UserDevice> {

    /**
     * 按设备 ID 查询设备记录。
     *
     * @param deviceId 设备唯一标识
     * @return 设备记录，不存在返回空
     */
    @Select("SELECT id, user_id, device_id, device_name, os_version, app_version, last_active_at, created_at "
            + "FROM user_device WHERE device_id = #{deviceId} LIMIT 1")
    Optional<UserDevice> findByDeviceId(@Param("deviceId") String deviceId);

    /**
     * 按设备 ID 写入 / 更新设备记录（INSERT ... ON DUPLICATE KEY UPDATE）。
     *
     * <p>依赖 {@code uk_device_id} 唯一索引实现 upsert，重复调用只会更新，
     * 因此自定义 SQL 不会触发 MyBatis-Plus 的雪花 ID 自动填充，需调用方先设置 {@code id}。
     *
     * @param device 设备实体
     * @return 受影响行数
     */
    @org.apache.ibatis.annotations.Insert("INSERT INTO user_device "
            + "(id, user_id, device_id, device_name, os_version, app_version, last_active_at, created_at) "
            + "VALUES (#{device.id}, #{device.userId}, #{device.deviceId}, #{device.deviceName}, "
            + "#{device.osVersion}, #{device.appVersion}, #{device.lastActiveAt}, "
            + "COALESCE(#{device.createdAt}, NOW())) "
            + "ON DUPLICATE KEY UPDATE "
            + "user_id = VALUES(user_id), "
            + "device_name = COALESCE(VALUES(device_name), device_name), "
            + "os_version = COALESCE(VALUES(os_version), os_version), "
            + "app_version = COALESCE(VALUES(app_version), app_version), "
            + "last_active_at = VALUES(last_active_at)")
    int upsert(@Param("device") UserDevice device);
}
