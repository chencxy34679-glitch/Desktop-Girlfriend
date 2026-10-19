package com.cxy.desktopgf.config;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.common.auth.CredentialsProvider;
import com.aliyun.oss.common.auth.DefaultCredentialProvider;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 阿里云 OSS 客户端配置。
 * <p>
 * 绑定 {@code aliyun.oss.*} 配置项,构造全局共享的 {@link OSS} 客户端 Bean。
 * OSS SDK 内部已使用 HTTP 连接池,因此单例足够,业务层无需自行缓存。
 * </p>
 * <p>
 * 关闭 Bean 由 Spring 容器在应用销毁时调用 {@link OSS#shutdown()},
 * 保证底层 HTTP 连接与异步线程安全释放。
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Data
@Configuration
@ConfigurationProperties(prefix = "aliyun.oss")
public class OssConfig {

    /**
     * OSS 服务接入点(Region 级),形如 {@code https://oss-cn-hangzhou.aliyuncs.com}。
     */
    private String endpoint;

    /**
     * 阿里云 AccessKey ID。
     */
    private String accessKeyId;

    /**
     * 阿里云 AccessKey Secret。
     */
    private String accessKeySecret;

    /**
     * 默认存储桶(Bucket)。上传/下载/删除时未显式指定时使用。
     */
    private String bucket;

    /**
     * CDN / 源站对外访问域名,用于拼接图片 URL。
     */
    private String urlDomain;

    /**
     * 注册 {@link OSS} Bean,作为全局唯一的 OSS 客户端。
     * <p>
     * OSS 未配置时返回 {@code null},让依赖注入处改为惰性初始化,
     * 避免开发期因为没有 AK/SK 导致整个应用启动失败。
     * </p>
     */
    @Bean(destroyMethod = "shutdown")
    public OSS ossClient() {
        if (endpoint == null || endpoint.isBlank()
                || accessKeyId == null || accessKeyId.isBlank()) {
            log.warn("aliyun.oss.endpoint / access-key-id 未配置, OSS 客户端将不注册(M2 阶段接入 OSS 时再配置)");
            return null;
        }
        CredentialsProvider credentialsProvider =
                new DefaultCredentialProvider(accessKeyId, accessKeySecret);
        OSS client = new OSSClientBuilder().build(endpoint, credentialsProvider);
        log.info("OSS 客户端初始化完成, endpoint={}, defaultBucket={}", endpoint, bucket);
        return client;
    }
}
