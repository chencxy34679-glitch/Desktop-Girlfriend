/*
 * 桌面女友(Desktop Girlfriend) — Spring Boot 主类
 *
 * 启动入口,加载 application.yml 配置,初始化 Spring 容器。
 * 监听端口由 application.yml 中的 server.port 控制(默认 8080)。
 */
package com.cxy.desktopgf;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 应用主类。
 *
 * @author cxy
 */
@SpringBootApplication
// Mapper 扫描:业务模块统一放在 com.cxy.desktopgf.module.*.mapper 下。
// 注意 Mapper 接口不要再额外标注 @Mapper,否则会与本扫描重复注册,
// 启动时报 "Invalid value type for attribute 'factoryBeanObjectType'"。
@MapperScan("com.cxy.desktopgf.module.**.mapper")
@EnableAsync
@EnableScheduling
public class DesktopGirlfriendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DesktopGirlfriendApplication.class, args);
    }
}