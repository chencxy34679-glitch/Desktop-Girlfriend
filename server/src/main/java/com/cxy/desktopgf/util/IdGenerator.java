package com.cxy.desktopgf.util;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.IdUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 雪花 ID(Snowflake)生成器。
 * <p>
 * 使用 hutool 的 <code>IdUtil.getSnowflake(workerId, datacenterId)</code> 实例,
 * 通过 {@link #getInstance()} 单例暴露。
 * </p>
 * <p>
 * 项目初期用户数 &lt; 100K 时,ID 可读性远高于 UUID,便于日志排错。
 * 在用户基数增长后,建议迁移到 Leaf / Sharding-JDBC 等专用发号器。
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Component
public class IdGenerator {

    /**
     * 工作机器 ID(0~31)。单实例部署时取 1。
     */
    private static final long WORKER_ID = 1L;

    /**
     * 数据中心 ID(0~31)。单实例部署时取 1。
     */
    private static final long DATACENTER_ID = 1L;

    private static volatile IdGenerator instance;

    private final cn.hutool.core.lang.generator.Snowflake snowflake;

    private IdGenerator() {
        this.snowflake = IdUtil.getSnowflake(WORKER_ID, DATACENTER_ID);
        log.info("IdGenerator 初始化完成, workerId={}, datacenterId={}", WORKER_ID, DATACENTER_ID);
    }

    /**
     * 获取单例。第一次访问时构造。
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
     * @return long 类型 ID
     */
    public long nextId() {
        Assert.notNull(snowflake, "Snowflake 实例未初始化");
        return snowflake.nextId();
    }

    /**
     * 兼容字符串形式,返回 19 位十进制雪花 ID。
     */
    public String nextIdStr() {
        return String.valueOf(nextId());
    }
}
