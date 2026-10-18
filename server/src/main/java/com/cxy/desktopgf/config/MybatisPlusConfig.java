package com.cxy.desktopgf.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.BlockAttackInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.OptimisticLockerInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 配置。
 * <p>
 * 主类(DesktopGirlfriendApplication)已使用 {@code @MapperScan},此处只关心:
 * <ul>
 *     <li>分页插件 — MySQL + LIMIT 分页,单页最大 500 条</li>
 *     <li>乐观锁插件 — 通过 {@code @Version} 字段启用</li>
 *     <li>防全表更新插件 — 防止误写不带条件的 update</li>
 *     <li>自动填充 — {@code create_time} / {@code update_time}</li>
 *     <li>逻辑删除 — 借助 {@code @TableLogic} 字段由实体控制,无需额外配置</li>
 * </ul>
 * 多租户插件当前不启用,保留接口以便后续接入。
 *
 * @author 陈相宇
 */
@Slf4j
@Configuration
public class MybatisPlusConfig {

    /**
     * 注册 MyBatis-Plus 拦截器链。
     */
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();

        // 多租户插件当前不启用,后续若需要可放开以下注释并实现 TenantHandler:
        // interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(new TenantHandler() { ... }));

        // 分页插件:MySQL 默认从 #{page}, #{size} 两个参数取分页
        PaginationInnerInterceptor pagination = new PaginationInnerInterceptor(DbType.MYSQL);
        pagination.setMaxLimit(500L);
        // 单页超过 maxLimit 时,直接拒绝,避免大数据量扫描拖死 DB
        pagination.setOverflow(false);
        interceptor.addInnerInterceptor(pagination);

        // 乐观锁:@Version 字段自动接管 update 条件
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());

        // 防止开发期误用全表 update / delete
        interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());

        log.info("MybatisPlus 拦截器链装载完成: pagination + optimistic-lock + block-attack");
        return interceptor;
    }

    /**
     * 字段自动填充:创建时间、更新时间。
     * <p>
     * 使用 MetaObjectHandler 在 insert/update 阶段由框架自动写入,
     * 不再要求业务层手动 setTime(),降低遗漏风险。
     * </p>
     */
    @Bean
    public MetaObjectHandler metaObjectHandler() {
        return new MetaObjectHandler() {
            @Override
            public void insertFill(MetaObject metaObject) {
                LocalDateTime now = LocalDateTime.now();
                this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
                this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
            }

            @Override
            public void updateFill(MetaObject metaObject) {
                this.strictUpdateFill(metaObject, "updateTime",
                        LocalDateTime.class, LocalDateTime.now());
            }
        };
    }
}
