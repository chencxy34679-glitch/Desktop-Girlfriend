package com.cxy.desktopgf.config;

import com.cxy.desktopgf.auth.AuthInterceptor;
import com.cxy.desktopgf.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置。
 * <p>
 * 集中处理:
 * <ul>
 *     <li>{@link AuthInterceptor} 注册到 {@code /v1/**} 全路径,
 *         显式排除公开接口(健康检查、登录注册)</li>
 *     <li>CORS 跨域配置</li>
 *     <li>静态资源(本地 /uploads 与打包后 classpath:/static/)</li>
 * </ul>
 * </p>
 * <p>
 * 兜底鉴权仍然由 {@link SecurityConfig} 负责,本配置仅在拦截器链层
 * 把 userId 写入 {@link com.cxy.desktopgf.auth.AuthContext} 供业务层使用。
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final JwtUtil jwtUtil;

    /**
     * 允许跨域的源列表,逗号分隔。空表示不开启跨域。
     */
    @Value("${desktop-girlfriend.cors.allowed-origins:*}")
    private String allowedOrigins;

    /**
     * 是否允许携带凭证(Cookie)。注意:为 {@code true} 时前端必须使用具体域名而非 {@code *}。
     */
    @Value("${desktop-girlfriend.cors.allow-credentials:true}")
    private boolean allowCredentials;

    /**
     * 允许的 HTTP 方法。
     */
    @Value("${desktop-girlfriend.cors.allowed-methods:GET,POST,PUT,PATCH,DELETE,OPTIONS}")
    private String allowedMethods;

    /**
     * 允许的请求头。
     */
    @Value("${desktop-girlfriend.cors.allowed-headers:*}")
    private String allowedHeaders;

    /**
     * 本地上传目录,映射到 /uploads/** 静态路径。
     */
    @Value("${desktop-girlfriend.upload.local-path:./uploads}")
    private String localUploadPath;

    /**
     * 注册 JWT 拦截器。
     * <p>
     * 仅放行 {@code /v1/health} 与 {@code /v1/auth/**},其余 {@code /v1/**}
     * 都需要有效 JWT。
     * </p>
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(jwtUtil))
                .addPathPatterns("/v1/**")
                .excludePathPatterns(
                        "/v1/health",
                        "/v1/auth/**"
                );
        log.info("AuthInterceptor 已注册到 /v1/** 路径(排除 health 与 auth)");
    }

    /**
     * CORS 跨域配置。
     * <p>
     * 由于 CorsConfig(独立类)与本类可共存,这里保留完整配置并优先级高于
     * 同名 Bean:WebMvcConfigurer 的 addCorsMappings 会合并到全局 MappedInterceptor。
     * </p>
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = parseCsv(allowedOrigins);
        String[] methods = parseCsv(allowedMethods);
        String[] headers = parseCsv(allowedHeaders);

        registry.addMapping("/**")
                .allowedOriginPatterns(origins)
                .allowedMethods(methods)
                .allowedHeaders(headers)
                .exposedHeaders("Authorization", "Content-Disposition")
                .allowCredentials(allowCredentials)
                .maxAge(3600);
        log.info("WebMvc CORS 配置完成, origins={}, methods={}, headers={}",
                String.join(",", origins), String.join(",", methods), String.join(",", headers));
    }

    /**
     * 静态资源映射。
     * <ul>
     *     <li>/uploads/** → ./uploads(运行时)或 ${user.dir}/uploads</li>
     *     <li>/static/** → classpath:/static/(打包后内置资源)</li>
     * </ul>
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 本地用户上传目录
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + localUploadPath + "/");

        // classpath 内置静态资源
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");

        log.info("WebMvc 静态资源映射完成, /uploads → {}, /static → classpath:/static/",
                localUploadPath);
    }

    /**
     * 简单的逗号分隔字符串解析工具。
     */
    private String[] parseCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return new String[0];
        }
        return csv.split(",");
    }
}
