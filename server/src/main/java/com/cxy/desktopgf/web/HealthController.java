/*
 * 健康检查 Controller。
 *
 * 提供 GET /v1/health 用于:
 *  - Jenkins 部署后探活
 *  - Nginx upstream 健康检查
 *  - BetterStack / UptimeRobot 监控
 *
 * 返回应用版本 + 服务端时间 + 数据库 / Redis / 阿里云 OSS 连通性。
 */
package com.cxy.desktopgf.web;

import com.cxy.desktopgf.common.Result;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查。
 */
@Slf4j
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;

    @Value("${spring.application.name}")
    private String appName;

    @Value("${server.port:8080}")
    private int serverPort;

    @GetMapping("/health")
    public Result<Map<String, Object>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("app", appName);
        data.put("version", "0.1.0");
        data.put("port", serverPort);
        data.put("serverTime", Instant.now().toString());
        data.put("uptime", "ok");

        // 依赖健康检查
        Map<String, Object> deps = new LinkedHashMap<>();
        deps.put("mysql", checkMysql());
        deps.put("postgres", checkPostgres());
        deps.put("redis", checkRedis());
        data.put("dependencies", deps);

        return Result.ok(data);
    }

    private String checkMysql() {
        try {
            Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return one != null && one == 1 ? "ok" : "unexpected";
        } catch (Exception e) {
            log.warn("MySQL 健康检查失败", e);
            return "fail: " + e.getMessage();
        }
    }

    private String checkPostgres() {
        // M2 阶段启用 PgVector(RAG)后再实现探活
        return "not_configured";
    }

    private String checkRedis() {
        try {
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            return "PONG".equalsIgnoreCase(pong) ? "ok" : "fail";
        } catch (Exception e) {
            log.warn("Redis 健康检查失败", e);
            return "fail: " + e.getMessage();
        }
    }
}