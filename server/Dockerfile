# ============================================
# 多阶段构建:JDK 编译 → JRE 运行(减小镜像体积)
# ============================================

# ---- Stage 1: 构建 ----
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

# 先复制 pom.xml,利用 Docker 缓存(依赖未变时不重新下载)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源码并打包
COPY src ./src
RUN mvn clean package -DskipTests -B \
    && cp target/desktop-girlfriend-server.jar /app.jar

# ---- Stage 2: 运行 ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# 时区设置(避免日志时间错乱)
RUN apk add --no-cache tzdata curl \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apk del tzdata

COPY --from=builder /app.jar /app/app.jar

# 健康检查(给 Docker / Kubernetes 用)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8080/v1/health || exit 1

EXPOSE 8080

# JVM 参数:容器友好
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]