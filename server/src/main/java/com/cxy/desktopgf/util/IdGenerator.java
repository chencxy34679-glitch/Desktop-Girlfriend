package com.cxy.desktopgf.util;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 雪花 ID(Snowflake)生成器。
 * <p>
 * 复用 MyBatis-Plus 内置的 {@link IdWorker},与 {@code @TableId(type = IdType.ASSIGN_ID)}
 * 使用同一套发号器,保证手工生成与 ORM 插入的主键不会重复。
 * </p>
 * <p>
 * 项目初期用户数 &lt; 100K 时,ID 可读性远高于 UUID,便于日志排错。
 * 用户基数显著增长后,建议迁移到 Leaf / Sharding-JDBC 等专用发号器。
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Component
public class IdGenerator {

    private static volatile IdGenerator instance;

    public IdGenerator() {
        log.info("IdGenerator 初始化完成, 使用 MyBatis-Plus 内置雪花发号器");
    }

    /**
     * 获取单例,第一次访问时构造。
     */
    public static IdGenerator getInstance() {
        if (instance == null) {
            synchronized (IdGenerator.class) {
                if (instance == null) {
                    instance = new IdGenerator();
                }
            }
        }
        return instance;
    }

    /**
     * 生成下一个分布式 ID。
     *
     * @return long 类型雪花 ID
     */
    public long nextId() {
        return IdWorker.getId();
    }

    /**
     * 字符串形式,返回 19 位十进制雪花 ID。
     */
    public String nextIdStr() {
        return Long.toString(nextId());
    }
}