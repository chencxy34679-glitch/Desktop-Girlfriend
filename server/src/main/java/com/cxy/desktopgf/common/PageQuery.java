package com.cxy.desktopgf.common;

import lombok.Data;

/**
 * 分页查询参数。所有列表查询接口(GET 与 POST body)统一使用该对象接收分页字段。
 * <p>
 * 默认 {@code page = 1, size = 20}。当 {@code size} 超过 100 时,业务层可自行截断;
 * 在 {@code MybatisPlusConfig} 中通过 {@code PaginationInnerInterceptor.maxLimit}
 * 限制最大单页条数。
 * </p>
 *
 * @author 陈相宇
 */
@Data
public class PageQuery {

    /**
     * 当前页码,从 1 开始。
     */
    private int page = 1;

    /**
     * 每页条数,默认 20。
     */
    private int size = 20;

    /**
     * 排序字段,可选。例如 {@code "create_time desc"} 或 {@code "id asc"}。
     * 字段名必须经过白名单校验,避免 SQL 注入。
     */
    private String orderBy;
}
