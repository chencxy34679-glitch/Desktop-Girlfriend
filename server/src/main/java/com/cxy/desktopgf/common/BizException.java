/*
 * 业务异常类。
 *
 * 抛出后会被 GlobalExceptionHandler 捕获,转为统一 Result.fail() 响应给调用方。
 * 不需要打印堆栈(避免日志噪音),只在 code >= 1000(系统错误)时打印。
 */
package com.cxy.desktopgf.common;

import lombok.Getter;

/**
 * 业务异常。
 */
@Getter
public class BizException extends RuntimeException {

    /** 业务错误码,前端可按 code 做特殊处理 */
    private final int code;

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BizException(ErrorCode errorCode) {
        this(errorCode.getCode(), errorCode.getMessage());
    }

    public BizException(ErrorCode errorCode, String detail) {
        this(errorCode.getCode(), errorCode.getMessage() + ": " + detail);
    }

    /**
     * 静态工厂:等价于 {@code new BizException(errorCode, message)},但更符合调用习惯。
     *
     * @param errorCode 错误码枚举
     * @param message   自定义提示信息
     * @return 业务异常实例
     */
    public static BizException fail(ErrorCode errorCode, String message) {
        return new BizException(errorCode, message);
    }

    /**
     * 静态工厂:使用错误码的默认文案。
     *
     * @param errorCode 错误码枚举
     * @return 业务异常实例
     */
    public static BizException fail(ErrorCode errorCode) {
        return new BizException(errorCode);
    }
}