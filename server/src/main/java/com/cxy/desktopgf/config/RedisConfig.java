package com.cxy.desktopgf.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 配置类。
 * <p>
 * 提供两个核心 Bean:
 * <ul>
 *     <li>{@link StringRedisTemplate} — Spring Boot 自动装配,这里再次声明以固定序列化器</li>
 *     <li>{@link RedisTemplate} — 对象序列化模板,用于对话缓存 / 限流计数等</li>
 * </ul>
 * </p>
 * <p>
 * 所有序列化统一采用 Jackson + UTF-8 + {@link JavaTimeModule} 以兼容 JDK 8 时间类。
 * </p>
 *
 * @author 陈相宇
 */
@Configuration
public class RedisConfig {

    /**
     * Redisson 单节点连接地址,例如 {@code redis://127.0.0.1:6379}。
     */
    @Value("${spring.data.redis.host:127.0.0.1}")
    private String redisHost;

    /**
     * Redis 端口。
     */
    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    /**
     * Redis 密码(为空表示无密码)。
     */
    @Value("${spring.data.redis.password:}")
    private String redisPassword;

    /**
     * Redis 数据库索引。
     */
    @Value("${spring.data.redis.database:0}")
    private int redisDatabase;

    /**
     * 全局使用的 RedisTemplate,Key/HashKey 用 UTF-8 String,
     * Value 用 Jackson 序列化为 JSON。
     *
     * @param connectionFactory Spring Boot 自动配置的连接工厂
     * @return 配置好的 RedisTemplate
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer(buildObjectMapper());

        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        template.afterPropertiesSet();
        return template;
    }

    // TODO(M2 计费阶段):分布式锁 / 限流 Lua / Bitmap 场景需要 Redisson,
    //  届时再引入 redisson-spring-boot-starter 依赖并补充 redissonClient() Bean。
    //  当前阶段用 Spring Data Redis 的 RedisTemplate.setEnableTransactionSupport 即可满足。

    /**
     * 构建支持 JDK 8+ 时间类的 ObjectMapper,禁用日期时间戳。
     */
    private ObjectMapper buildObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        mapper.activateDefaultTyping(
                mapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                com.fasterxml.jackson.annotation.JsonTypeInfo.As.PROPERTY);
        return mapper;
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RedisConfig.class);
}
