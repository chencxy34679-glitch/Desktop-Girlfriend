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
@MapperScan("com.cxy.desktopgf.module.**.mapper")
@EnableAsync
@EnableScheduling
public class DesktopGirlfriendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DesktopGirlfriendApplication.class, args);
    }
}