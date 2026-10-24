package com.cxy.desktopgf.auth;

/**
 * 当前线程用户上下文。
 * <p>
 * 基于 {@link ThreadLocal} 在一次 HTTP 请求的生命周期内传递用户 ID。
 * 由 {@link com.cxy.desktopgf.auth.AuthInterceptor} 在解析 JWT 后写入,
 * 由 {@code GlobalExceptionHandler} 或业务层在 finally 中显式清理,
 * 防止线程复用导致的数据串扰。
 * </p>
 *
 * @author 陈相宇
 */
public final class AuthContext {

    /**
     * 存储当前请求线程的用户 ID。
     */
    private static final ThreadLocal<Long> CURRENT_USER_ID = new ThreadLocal<>();

    private AuthContext() {
    }

    /**
     * 写入当前线程的用户 ID。
     *
     * @param userId 已认证的用户 ID
     */
    public static void setUserId(Long userId) {
        CURRENT_USER_ID.set(userId);
    }

    /**
     * 取出当前线程的用户 ID。
     *
     * @return 用户 ID,或 {@code null}(尚未认证)
     */
    public static Long getUserId() {
        return CURRENT_USER_ID.get();
    }

    /**
     * 清理当前线程上下文。
     * <p>
     * 必须在请求结束的 finally 块中调用,避免 {@link ThreadLocal} 泄漏。
     * </p>
     */
    public static void clear() {
        CURRENT_USER_ID.remove();
    }
}
