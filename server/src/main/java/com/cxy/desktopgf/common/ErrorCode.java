/*
 * 业务错误码枚举。
 *
 * 1xxx = 通用错误
 * 2xxx = 用户/认证相关
 * 3xxx = 计费/支付相关
 * 4xxx = 角色/RAG 相关
 * 5xxx = Agent 工具相关
 * 6xxx = AI 服务相关(LLM/TTS/STT 调用错误)
 * 9xxx = 系统错误
 */
package com.cxy.desktopgf.common;

import lombok.Getter;

@Getter
public enum ErrorCode {

    OK(0, "ok"),

    // 1xxx 通用
    BAD_REQUEST(1000, "请求参数错误"),
    UNAUTHORIZED(1001, "未登录"),
    FORBIDDEN(1002, "无权限"),
    NOT_FOUND(1003, "资源不存在"),
    RATE_LIMIT(1004, "请求过于频繁"),

    // 2xxx 用户/认证
    USER_NOT_FOUND(2001, "用户不存在"),
    USER_ALREADY_EXISTS(2002, "用户已存在"),
    INVALID_CREDENTIALS(2003, "用户名或密码错误"),
    TOKEN_EXPIRED(2004, "登录已过期"),
    REFRESH_TOKEN_INVALID(2005, "刷新令牌无效"),

    // 3xxx 计费/支付
    INSUFFICIENT_CREDITS(3001, "积分不足"),
    DAILY_QUOTA_EXHAUSTED(3002, "今日额度已用完"),
    SUBSCRIPTION_NOT_ACTIVE(3003, "会员未激活"),
    PAYMENT_FAILED(3004, "支付失败"),
    ORDER_NOT_FOUND(3005, "订单不存在"),

    // 4xxx 角色/RAG
    CHARACTER_NOT_FOUND(4001, "角色不存在"),
    CHARACTER_NOT_VERIFIED(4002, "角色未通过审核"),
    RAG_DOCUMENT_PROCESSING(4003, "知识库处理中"),
    RAG_DOCUMENT_FAILED(4004, "知识库处理失败"),

    // 5xxx Agent
    AGENT_TOOL_NOT_FOUND(5001, "工具不存在"),
    AGENT_TOOL_DISABLED(5002, "工具已禁用"),
    AGENT_TOOL_LIMIT_EXCEEDED(5003, "工具调用次数已达上限"),
    AGENT_TOOL_DENIED(5004, "工具调用被拒绝"),
    AGENT_DAILY_QUOTA_EXHAUSTED(5005, "今日 Agent 额度已用完"),

    // 6xxx AI 服务
    LLM_UPSTREAM_ERROR(6001, "上游 LLM 服务异常"),
    LLM_TIMEOUT(6002, "LLM 调用超时"),
    TTS_UPSTREAM_ERROR(6003, "TTS 服务异常"),
    STT_UPSTREAM_ERROR(6004, "STT 服务异常"),

    // 9xxx 系统
    INTERNAL_ERROR(9000, "系统繁忙,请稍后重试");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    /** 显式 getter,不依赖 Lombok 在枚举上的注解处理。 */
    public int getCode() {
        return code;
    }

    /** 显式 getter,不依赖 Lombok 在枚举上的注解处理。 */
    public String getMessage() {
        return message;
    }
}