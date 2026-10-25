/**
 * 桌面宠物窗口状态机。
 *
 * 用户报告的 Bug（doc/Bug/Desktop Girlfriend Bug.md + 后续反馈）：
 *  - 长按拖拽晃动时，窗口长和宽都会变大
 *  - 点击"恢复默认位置"失效
 *  - 人物逐渐偏离
 *
 * 用户的根本诉求：拖拽的时候窗口大小不变，调整大小只能靠右键菜单。
 *
 * 修缮思路（激进型）：
 *  1) beginDrag 记录 frozenSize（drag-start 时的 size）
 *  2) setMinimumSize + setMaximumSize 把窗口锁死在 frozenSize
 *  3) BrowserWindow 加 maximizable:false / fullscreenable:false 禁 Win11 系统级 resize
 *  4) drag 期间 resize event 用 setBounds 把 size 压回 frozenSize
 *  5) endDrag 用 setBounds 强制把 size 设回 frozenSize
 *
 * 注意：调试用的 console.log 已经全部注释掉，行为保留。
 */

import { BrowserWindow, screen } from 'electron';

const MIN_WIN_SIZE = 64;
/** 拖拽位移累计到这一步才算"用户主动离开过默认位置"，避免长按微动误判 */
const DRAG_LEAVE_THRESHOLD_PX = 12;

export interface WindowStateOptions {
  minSize?: number;
}

export class WindowState {
  private minSize = MIN_WIN_SIZE;
  /** 当前窗口是否在右下角/任务栏之上对齐好的初始位置 */
  atDefaultPosition = true;
  /** 拖拽锁：true 期间拒绝所有 setSize，仅允许 moveBy */
  isDragging = false;
  /** 进入拖拽后的累计位移（screen 坐标绝对位移） */
  private dragAccumDx = 0;
  private dragAccumDy = 0;
  /**
   * 拖拽起始时的**内容尺寸** —— 拖拽期间任何 resize 事件（包括 Windows 系统
   * 的 Snap Layout / Aero Snap / DPI 调整）都会被强制调回这个 size。
   *
   * ★ 为什么存"内容尺寸"而不是 getSize() ★
   *
   * Electron 在 Windows 上的尺寸语义（本地探针实测，Electron 33.4.11 + Win11
   * 150% DPI，240 帧拖拽）：
   *  - `getSize()`       → **窗口**（外框）尺寸，含 1px 不可见边框
   *  - `getContentSize()`→ **内容**（客户区）尺寸
   *  - `getContentBounds()` → 内容区原点 + 尺寸
   *  - `setContentBounds()` → **移动并缩放客户区**，与 getContentBounds 配对
   *  - `setBounds(w,h)`  → 窗口语义（官方文档：Resizes and moves the window）
   *  - `setPosition()`   → ★ 每调用一次，外框就长 1px ★
   *
   * 混用 getSize() 与 setBounds 会造成 1px 误差；而反复调 setPosition 更糟 ——
   * 它会逐帧累积，实测 60 帧能把外框撑宽 60px，这就是"长按拖拽时窗口不断变大"
   * 的根因。详见 moveByWhileDragging 的注释。
   *
   * 本类统一采用**内容语义**：冻结 getContentSize()、移动用 setContentBounds()，
   * 读写都用 getContentBounds()，保证与角色实际绘制区域（客户区）严格同源。
   */
  private frozenSize: [number, number] | null = null;
  /**
   * 我们自己的 setSize / setBounds 在执行期间设 true，resize event 看到 true 就跳过，
   * 避免 freeze → setSize → resize → freeze 死循环。
   */
  private internalResize = false;
  /**
   * 拖拽**开始时**窗口是否处在默认位置（右下角）。
   *
   * ★ 这个状态必须单独记，不能只看"累计位移是否 < 阈值" ★
   *
   * 旧逻辑：endDrag 时只要累计位移 < 12px 就把窗口弹回右下角。
   * 但用户如果**先把宠物拖到别处**（此时 atDefaultPosition=false），
   * 之后再来一次"长按 + 轻晃几像素"，累计位移必然 < 12px，
   * 于是窗口会被强行瞬移回右下角 —— 探针实测这是 **706px 的跳变**，
   * 正是用户说的"长按拖拽晃动能明显感觉到偏移"。
   *
   * 正确语义：只有**本来就是待在右下角**的窗口，长按微动才应该弹回原地；
   * 用户自己挪走过的窗口，任何时候都不该被系统拽回去。
   */
  private wasAtDefaultAtDragStart = true;
  /**
   * 拖拽期间自己维护的窗口位置（累加值，**不回读**）。
   *
   * 为什么要自己记：setPosition 每调一次就长 1px，所以拖拽全程不碰
   * setPosition，改用 setContentBounds（内容语义）来移动。
   *
   * 为什么不"读回实际落点"当基准：150% DPI 下 Chromium 的 DIP↔物理像素换算
   * 用整数截断，窗口位置只能落在偶数 DIP（探针实测：请求 303 实际落在 302）。
   * 若每帧读回实际落点再叠加新位移，这个 1px 的量化误差会被**逐帧累积**；
   * 保留"理想位置"累加值、让系统每次重新量化，总误差才能稳定在 1px 以内。
   */
  private dragPosX = 0;
  private dragPosY = 0;

  constructor(opts: WindowStateOptions = {}) {
    this.minSize = opts.minSize ?? MIN_WIN_SIZE;
  }

  /** 当前窗口所在 display 的工作区 */
  getWorkArea(win: BrowserWindow): { x: number; y: number; width: number; height: number } {
    const wa = screen.getDisplayMatching(win.getBounds()).workArea;
    return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
  }

  /** 把窗口对齐到它所在 display 工作区右下角（用于启动 / reset） */
  alignToDefault(win: BrowserWindow): void {
    if (win.isDestroyed()) return;
    const wa = this.getWorkArea(win);
    // 统一用**内容语义**：角色画在客户区里，定位也按客户区算，
    // 右下角对齐时让"内容右边缘 / 下边缘"贴住工作区边缘。
    const [w, h] = win.getContentSize();
    const frozen: [number, number] = this.frozenSize ?? [w, h];
    const x = Math.round(wa.x + wa.width - frozen[0]);
    const y = Math.round(wa.y + wa.height - frozen[1]);
    this.internalResize = true;
    win.setContentBounds({ x, y, width: frozen[0], height: frozen[1] }, false);
    this.internalResize = false;
    // 同步内部维护的位置，供后续拖拽累加
    this.dragPosX = x;
    this.dragPosY = y;
  }

  /**
   * 调整窗口尺寸（同步路径）。
   * 拖拽期间**直接拒绝**：不挂起、不应用、不修改任何 state。
   *
   * 参数 w/h 是**内容尺寸**（与 renderer 侧 imageSize * scale 同源）。
   */
  tryResize(win: BrowserWindow, w: number, h: number): boolean {
    if (win.isDestroyed()) return false;
    if (this.isDragging) {
      // console.log('[main][REJECT] tryResize during drag → keep current size:', w, 'x', h);
      return false;
    }
    const ww = Math.max(this.minSize, Math.floor(w));
    const hh = Math.max(this.minSize, Math.floor(h));
    const cur = win.getContentSize();
    if (cur[0] === ww && cur[1] === hh) {
      return true;
    }
    // console.log('[main][setSize]', cur[0], 'x', cur[1], '→', ww, 'x', hh);
    this.internalResize = true;
    win.setMinimumSize(this.minSize, this.minSize);
    // 用 setContentSize：语义明确（内容尺寸），不会和 getSize() 的窗口尺寸混淆
    win.setContentSize(ww, hh, false);
    this.internalResize = false;
    // frozenSize 与拖拽期 setBounds 的参数同源（都是内容尺寸）
    this.frozenSize = [ww, hh];
    this.snapAfterResize(win);
    return true;
  }

  /**
   * 被 BrowserWindow 的 'resize' 事件触发 —— **任何** resize 来源都走这里
   * （包括 setSize、Win32 SetWindowPos、Windows Snap Layout / Aero Snap、
   * DPI 缩放、remote desktop 等系统层）。
   *
   * 行为：
   *  - 我们自己的 setSize / setBounds（internalResize=true）→ 跳过
   *  - 拖拽期间 → 用 setBounds 强制把 size 调回 frozenSize（同时锁 position）
   *  - 非拖拽期间 → 不做任何事
   */
  onExternalResize(win: BrowserWindow): void {
    if (win.isDestroyed()) return;
    if (this.internalResize) return;
    if (!this.isDragging) return;
    if (!this.frozenSize) return;
    const cur = win.getContentSize();
    if (cur[0] === this.frozenSize[0] && cur[1] === this.frozenSize[1]) return;
    // console.log('[main][FREEZE] setContentBounds', cur[0], 'x', cur[1], '→', this.frozenSize[0], 'x', this.frozenSize[1]);
    this.internalResize = true;
    win.setContentBounds(
      {
        x: this.dragPosX,
        y: this.dragPosY,
        width: this.frozenSize[0],
        height: this.frozenSize[1],
      },
      false,
    );
    this.internalResize = false;
  }

  /** 重设 minimumSize（个别 reset 流程用） */
  resetMinSize(win: BrowserWindow): void {
    if (win.isDestroyed()) return;
    win.setMinimumSize(this.minSize, this.minSize);
  }

  /** 进入拖拽期。幂等。 */
  beginDrag(win?: BrowserWindow): void {
    if (this.isDragging) return;
    this.isDragging = true;
    this.dragAccumDx = 0;
    this.dragAccumDy = 0;
    // ★ 记住"拖拽开始时窗口在不在默认位置"，endDrag 的弹回判定要用 ★
    this.wasAtDefaultAtDragStart = this.atDefaultPosition;
    if (win && !win.isDestroyed()) {
      // 冻结**内容尺寸**（与 setContentBounds 的参数同源）
      const content = win.getContentSize();
      this.frozenSize = [content[0], content[1]];

      // 位置从这里开始自己维护，不再每帧回读 getPosition()
      // 用内容原点（客户区左上角）而不是窗口原点：角色画在客户区里，
      // 光标抓的也是客户区，保持同源才不会产生 1px 的相对错位。
      const cb = win.getContentBounds();
      this.dragPosX = cb.x;
      this.dragPosY = cb.y;

      // 用 setMinimumSize + setMaximumSize 把**外框**锁死。
      // ★ 注意：这两个 API 是"窗口"尺寸语义，不能用内容尺寸去设，
      //   否则锁的值比实际外框小 1px，Windows 每帧都要重新夹一次尺寸，
      //   外框就会在 294↔295 之间来回翻（探针实测 200 帧里 199 帧尺寸都在变）。
      const outer = win.getSize();
      win.setMinimumSize(outer[0], outer[1]);
      win.setMaximumSize(outer[0], outer[1]);
    }
  }

  /**
   * 拖拽期间的位移累加；同时把窗口挪过去。
   *
   * ★ 关键实现要点（修"长按拖拽时窗口不断变大"）★
   *
   * 现象：每帧调 `win.setPosition()`，外框宽度每帧长 1px，60 帧能长 60px，
   *      停止拖拽后才被压回去 —— 正是用户反馈的"长按拖拽不停晃动就会变大"。
   *
   * 根因（探针实测确认，Windows 11 + Electron 33.4.11）：
   *  在 Windows 上，无边框窗口每次调用 `setPosition()` 都会让**外框**长 1px，
   *  而**内容尺寸不变**（探针 D：30 次 setPosition 后外框 +1、内容 +0）。
   *  这与"有没有加 min/max 锁"无关 —— 裸调 setPosition 同样会漂。
   *
   * 修法：
   *  1. 拖拽全程**不再调用 setPosition**，改用 setContentBounds（内容语义）；
   *  2. 尺寸用**内容尺寸**做不变量（getContentSize），与 setContentBounds 同源；
   *  3. 位置自己维护（dragPosX/dragPosY），只累加不回读。
   *
   * ★ 为什么位置要"累加理想值"而不是"读回实际值" ★
   *  显示器是 150% DPI，Chromium 的 DIP↔物理像素换算用整数截断，
   *  窗口位置只能落在偶数 DIP（探针实测：请求 303 实际落在 302）。
   *  若每帧读回实际落点再叠加新位移，这 1px 的量化误差会被**逐帧累积**；
   *  保留理想值累加、让系统每次重新量化，总误差才能稳定在 1px 以内。
   */
  moveByWhileDragging(win: BrowserWindow, dx: number, dy: number): void {
    if (win.isDestroyed()) return;

    this.dragPosX += dx;
    this.dragPosY += dy;
    this.dragAccumDx += dx;
    this.dragAccumDy += dy;

    if (!this.frozenSize) {
      // 没有 frozenSize（理论上不会发生），退回普通 setPosition
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + dx), Math.round(y + dy), false);
      return;
    }

    this.internalResize = true;
    win.setContentBounds(
      {
        x: Math.round(this.dragPosX),
        y: Math.round(this.dragPosY),
        // 内容语义，与 frozenSize 同源
        width: this.frozenSize[0],
        height: this.frozenSize[1],
      },
      false,
    );
    this.internalResize = false;
  }

  /**
   * 结束拖拽：
   *  - 累计位移 < 阈值 **且 拖拽开始时窗口就在默认位置** → 长按微动，贴回右下
   *  - 否则保留用户自己拖到的位置
   *  - 解除 setMin/setMax 锁定
   *  - ★ 用 setContentBounds 强制把 size 设回 frozenSize（同时锁 position）
   *
   * ★★ 弹回条件为什么必须带 wasAtDefaultAtDragStart ★★
   * 用户若先把宠物拖到别处（atDefaultPosition=false），之后再做一次
   * "长按 + 轻晃几像素"，累计位移必然 < 12px。旧逻辑此时会把窗口
   * 强行瞬移回右下角 —— 探针实测是 706px 的跳变，
   * 这正是用户说的"长按拖拽晃动能明显感觉到偏移"。
   * 用户自己挪走过的窗口，任何时候都不该被系统拽回去。
   */
  endDrag(win: BrowserWindow): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const movedDistance = Math.hypot(this.dragAccumDx, this.dragAccumDy);
    const shouldSnapBack =
      movedDistance < DRAG_LEAVE_THRESHOLD_PX && this.wasAtDefaultAtDragStart;
    if (shouldSnapBack) {
      this.atDefaultPosition = true;
      if (!win.isDestroyed()) this.alignToDefault(win);
    } else if (movedDistance >= DRAG_LEAVE_THRESHOLD_PX) {
      // 用户明确拖动了 → 记住"已经离开默认位置"
      this.atDefaultPosition = false;
    }
    // movedDistance < 阈值 且 拖拽开始时就不在默认位置：
    //   保持 atDefaultPosition=false，窗口留在用户放的位置，不做任何瞬移。
    if (!win.isDestroyed()) {
      // 解锁 setMin/setMax
      win.setMinimumSize(this.minSize, this.minSize);
      win.setMaximumSize(0, 0);
      // 尺寸若被系统改动，压回 frozenSize（同时锁 position）
      if (this.frozenSize) {
        const cur = win.getContentSize();
        if (cur[0] !== this.frozenSize[0] || cur[1] !== this.frozenSize[1]) {
          // console.log('[main][END-FREEZE] setContentBounds →', this.frozenSize[0], 'x', this.frozenSize[1]);
          this.internalResize = true;
          win.setContentBounds(
            {
              x: this.dragPosX,
              y: this.dragPosY,
              width: this.frozenSize[0],
              height: this.frozenSize[1],
            },
            false,
          );
          this.internalResize = false;
        }
      }
    }
  }

  /** 强制定位（菜单触发用） */
  moveBy(win: BrowserWindow, dx: number, dy: number): void {
    this.moveByWhileDragging(win, dx, dy);
  }

  /** 重置到默认位置（右键菜单触发） */
  resetToDefault(win: BrowserWindow): void {
    if (win.isDestroyed()) return;
    this.atDefaultPosition = true;
    this.alignToDefault(win);
  }

  /**
   * resize 后的位置调整：
   *  - atDefaultPosition=true：贴回当前 display 的 workArea 右下角
   *  - atDefaultPosition=false：仅做边界 clamp
   *
   * 统一用内容语义（getContentBounds / setContentBounds），与拖拽链路同源。
   */
  private snapAfterResize(win: BrowserWindow): void {
    if (win.isDestroyed()) return;
    const wa = this.getWorkArea(win);
    // 内容尺寸（与 frozenSize / setContentBounds 同源）
    const [w, h] = win.getContentSize();
    const cb = win.getContentBounds();
    let nx = this.atDefaultPosition ? wa.x + wa.width - w : cb.x;
    let ny = this.atDefaultPosition ? wa.y + wa.height - h : cb.y;
    if (nx < wa.x) nx = wa.x;
    if (ny < wa.y) ny = wa.y;
    if (nx + w > wa.x + wa.width) nx = wa.x + wa.width - w;
    if (ny + h > wa.y + wa.height) ny = wa.y + wa.height - h;
    if (nx !== cb.x || ny !== cb.y) {
      // 用 setContentBounds 而不是 setPosition ——
      // setPosition 在 Windows 上会让外框长 1px
      this.internalResize = true;
      win.setContentBounds(
        {
          x: Math.round(nx),
          y: Math.round(ny),
          width: w,
          height: h,
        },
        false,
      );
      this.internalResize = false;
      this.dragPosX = Math.round(nx);
      this.dragPosY = Math.round(ny);
    }
  }
}