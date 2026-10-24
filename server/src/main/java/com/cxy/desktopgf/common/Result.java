/*
 * 统一 API 响应包装类。
 *
 * 所有 REST 接口返回此类型,code=0 表示成功,code!=0 表示业务异常。
 * 桌面端根据 code 判断是否需要特殊处理。
 */
package com.cxy.desktopgf.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 统一响应包装。
 *
 * @param <T> 数据类型
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> {

    /** 业务码:0 成功,其他 失败 */
    private int code;

    /** 提示信息 */
    private String message;

    /** 业务数据 */
    private T data;

    /** 服务端时间戳(毫秒) */
    private long timestamp;

    public static <T> Result<T> ok() {
        return ok(null);
    }

    public static <T> Result<T> ok(T data) {
        Result<T> r = new Result<>();
        r.code = 0;
        r.message = "ok";
        r.data = data;
        r.timestamp = System.currentTimeMillis();
        return r;
    }

    public static <T> Result<T> fail(int code, String message) {
        Result<T> r = new Result<>();
        r.code = code;
        r.message = message;
        r.timestamp = System.currentTimeMillis();
        return r;
    }

    public static <T> Result<T> fail(BizException e) {
        return fail(e.getCode(), e.getMessage());
    }
}