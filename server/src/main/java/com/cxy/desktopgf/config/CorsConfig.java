/*
 * CORS 跨域配置。
 *
 * 桌面端 Electron 没有 origin(走 file://),但 Jenkins / 浏览器调试需要。
 * 生产环境应该限制 origin,但开发期放开方便调试。
 */
package com.cxy.desktopgf.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 跨域配置。
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/v1/**")
                .allowedOriginPatterns("*")           // 开发期放开;生产应限制 origin
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("X-Trace-Id")         // 暴露追踪 ID 给前端
                .allowCredentials(true)
                .maxAge(3600);
    }
}