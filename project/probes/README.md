# 拖拽探针（probes）

拖拽相关问题的**可复现测量工具**。每个探针都是一个独立的 Electron 主进程脚本，
用真实 `BrowserWindow` + **真实的 `src/main/window-state.ts`**（不是复刻实现）跑一遍，
把结论写进同目录的 `result*.json`。

跑法：

```bash
npm run probe:drag        # 回归探针（验证修复是否生效）
npm run probe:drag:all    # 全部探针
```

> 探针会真的弹出一个无边框透明窗口（约 1~3 秒），这是正常的。
> 结果写文件而不是 stdout —— Electron 在 Windows 上是 GUI 子系统，stdout 不落盘。

## 为什么要探针

用户反馈"长按拖拽晃动能明显感觉到偏移"，但**无法分辨**是"窗口真的变大了"
还是"位置相对光标有偏移"。肉眼判断在这个量级（1~2 px）上完全不可靠，
于是改成直接量：`getSize()` / `getContentSize()` / `getBounds()` / `getContentBounds()`
四组坐标逐帧对比。

## 环境事实（探针 1~3 实测，Electron 33.4.11 / Win11 11 / 显示器 150% DPI）

| 事实 | 证据 |
|---|---|
| `getSize()` = **外框**尺寸（含 1px 不可见边框） | result1 `size` vs `contentSize` |
| `getContentSize()` = **客户区**尺寸 | 同上 |
| `setBounds(w,h)` 是**窗口**语义（官方文档亦如此） | Electron `electron.d.ts` 注释 |
| `setContentBounds` 与 `getContentBounds` 配对，同为**内容**语义 | 同上 |
| `setPosition()` 每调一次，**外框**长 1px（内容不变） | result1 场景 D：30 次调用后外框 +1、内容 +0 |
| 150% DPI 下窗口位置只能落在**偶数 DIP** | result3：请求 303 实际落 302、请求 309 落 308、请求 315 落 314 |
| 每帧传 width/height 会让**不可见边框**在 294↔295 之间翻转 | result1 场景 B：200 帧里 199 帧外框尺寸都在变 |

## 三个探针各自回答什么

### probe1-drag-baseline.js —— 现状体检
加载生产 `window-state.ts`，模拟完整拖拽（beginDrag → 200 帧 moveBy → endDrag），
逐帧记录四组坐标，并给 `win.setBounds` 打桩统计调用次数。

场景 A：长按微动（累计 8px < 12px 阈值）后 endDrag 会发生什么
场景 B：200 帧抖动，尺寸漂移 / 位置漂移
场景 C：`setBounds` 的 width/height 到底是外框还是内容语义
场景 D：连续 30 次 `setPosition` 会不会让窗口长大

### probe2-move-strategies.js —— 移动方式选型
对比 4 种组合（`setBounds` vs `setContentBounds` × min/max 锁内容尺寸 vs 锁外框尺寸），
指标是"内容原点最大误差 / 内容尺寸是否恒定 / 外框尺寸是否恒定"。

**结论**：四种组合结果完全一致 → 翻转不是 API 选型或 min/max 锁的问题。

### probe3-dpi-quantization.js —— 定位 1px 抖动的触发条件
单向拖 vs 来回晃 vs ±1 微晃 vs 逐像素右移，**并打印显示器 scaleFactor**。

**结论**：误差恒为 0 或 -1，取决于**请求位置是不是奇数** —— 这是 150% DPI 下
Chromium 的 DIP↔物理像素整数截断造成的，属于 OS 层限制，无法消除，
但只要保留"理想位置累加值"（而不是每帧读回实际落点），误差就不会累积。

### probe5-regression.js —— 修复回归验证
加载**修复后**的 `window-state.ts`，验证三件事：

| 用例 | 期望 | 结果 |
|---|---|---|
| T1 拖到别处后长按轻晃 | 留在原地，**不瞬移** | ✅ 位移 0px（旧逻辑实测瞬移 200~700px） |
| T2 默认位置长按轻晃 | 弹回原地（保留原行为） | ✅ 位移 0px |
| T3 120 帧抖动 | 内容尺寸恒定 + 误差 ≤1px | ✅ `294x570` 恒定，误差 1px |

## 修复要点（对应 `src/main/window-state.ts`）

1. **统一内容语义**：冻结 `getContentSize()`、移动用 `setContentBounds()`、
   读写都用 `getContentBounds()`。角色画在客户区里，定位也按客户区算，保持同源。
2. **min/max 锁改用外框尺寸**（`win.getSize()`）：这两个 API 是窗口语义，
   拿内容尺寸去设会锁得比实际外框小 1px，Windows 每帧都要重新夹一次。
3. **位置保留理想累加值**，不读回实际落点 —— 否则 150% DPI 的量化误差会逐帧累积。
4. **endDrag 的弹回条件加一道 `wasAtDefaultAtDragStart`**：
   用户自己挪走过的窗口，长按微动时不再被系统拽回右下角。
