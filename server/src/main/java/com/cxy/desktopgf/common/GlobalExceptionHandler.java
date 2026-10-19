/*
 * 全局异常处理器。
 *
 * 捕获 Controller 抛出的 BizException / ValidationException / 其他 Exception,
 * 转为统一 Result.fail() 响应给前端。
 */
package com.cxy.desktopgf.common;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 业务异常 */
    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result<Void>> handleBiz(BizException e, HttpServletRequest req) {
        log.warn("[业务异常] {} {} - {}: {}", req.getMethod(), req.getRequestURI(), e.getCode(), e.getMessage());
        return ResponseEntity.ok(Result.fail(e));
    }

    /** 参数校验失败 */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ResponseEntity<Result<Void>> handleValidation(Exception e, HttpServletRequest req) {
        String message = (e instanceof MethodArgumentNotValidException mae)
                ? mae.getBindingResult().getFieldError() != null ? mae.getBindingResult().getFieldError().getDefaultMessage() : "参数校验失败"
                : "参数绑定失败";
        log.warn("[参数校验] {} {}: {}", req.getMethod(), req.getRequestURI(), message);
        return ResponseEntity.ok(Result.fail(ErrorCode.BAD_REQUEST.getCode(), message));
    }

    /** Spring Security 鉴权失败 */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Result<Void>> handleAuth(AuthenticationException e, HttpServletRequest req) {
        log.warn("[鉴权失败] {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Result.fail(ErrorCode.UNAUTHORIZED.getCode(), "请先登录"));
    }

    /** Spring Security 权限不足 */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Result<Void>> handleAccessDenied(AccessDeniedException e, HttpServletRequest req) {
        log.warn("[权限不足] {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Result.fail(ErrorCode.FORBIDDEN.getCode(), "无权限访问"));
    }

    /** 兜底:未预期异常 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleAll(Exception e, HttpServletRequest req) {
        log.error("[系统异常] {} {}", req.getMethod(), req.getRequestURI(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.fail(ErrorCode.INTERNAL_ERROR.getCode(), ErrorCode.INTERNAL_ERROR.getMessage()));
    }
}