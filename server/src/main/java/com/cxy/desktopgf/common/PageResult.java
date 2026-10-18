package com.cxy.desktopgf.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;

import java.util.Collections;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 分页响应包装。
 * <p>
 * 与 MyBatis-Plus 的 {@link IPage} 结构对齐,但保持纯净 POJO 形态,便于跨模块复用与缓存序列化。
 * 包含记录列表、总条数、当前页与每页大小四要素。
 * </p>
 *
 * @param <T> 列表元素类型
 * @author 陈相宇
 */
@Data
public class PageResult<T> {

    /**
     * 当前页数据。
     */
    private List<T> records;

    /**
     * 总记录数。
     */
    private long total;

    /**
     * 当前页码(从 1 开始)。
     */
    private int page;

    /**
     * 每页条数。
     */
    private int size;

    public PageResult() {
        this.records = Collections.emptyList();
        this.page = 1;
        this.size = 20;
        this.total = 0L;
    }

    public PageResult(List<T> records, long total, int page, int size) {
        this.records = records == null ? Collections.emptyList() : records;
        this.total = total;
        this.page = page;
        this.size = size;
    }

    /**
     * 从 MyBatis-Plus 的 {@link IPage} 构造结果。
     */
    public static <T> PageResult<T> of(IPage<T> page) {
        if (page == null) {
            return new PageResult<>();
        }
        return new PageResult<>(page.getRecords(), page.getTotal(),
                (int) page.getCurrent(), (int) page.getSize());
    }

    /**
     * 类型转换:复用分页元数据,把 records 从 {@code S} 映射成 {@code T}。
     * <p>
     * 典型用法:把 {@code PageResult<UserDO>} 转成 {@code PageResult<UserVO>}。
     * </p>
     */
    public <S, T> PageResult<T> map(Function<S, T> mapper) {
        List<T> mapped = this.records == null
                ? Collections.emptyList()
                : this.records.stream().map(mapper).collect(Collectors.toList());
        return new PageResult<>(mapped, this.total, this.page, this.size);
    }
}
