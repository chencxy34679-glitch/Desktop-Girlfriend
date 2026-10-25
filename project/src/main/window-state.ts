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
   * Electron 在 Windows 上的尺寸语义（实测确认，Electron 33 + Win11）：
   *  - `getSize()`       → **窗口**尺寸（含 1px 不可见边框）
   *  - `getContentSize()`→ **内容**尺寸（不含边框）
   *  - `setBounds(w,h)`  → w/h 是**内容**语义
   *  - `setContentSize()`→ 内容语义
   *  - `setPosition()`   → ★ 每调用一次，窗口就会长 1px ★
   *
   * 混用 getSize() 与 setBounds 会造成 1px 误差；而反复调 setPosition 更糟 ——
   * 它会逐帧累积，实测 60 帧能把窗口撑宽 60px，这就是"长按拖拽时窗口不断变大"
   * 的根因。详见 moveByWhileDragging 的注释。
   */
  private frozenSize: [number, number] | null = null;
  /**
   * 我们自己的 setSize / setBounds 在执行期间设 true，resize event 看到 true 就跳过，
   * 避免 freeze → setSize → resize → freeze 死循环。
   */
  private internalResize = false;
  /**
   * 拖拽期间自己维护的窗口位置（累加值，**不回读** getPosition）。
   *
   * 为什么要自己记：setPosition 每调一次就长 1px，所以拖拽全程不碰
   * setPosition，改用 setBounds（带固定的内容宽高）来移动。
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
    // 用内容尺寸算右下角位置（与 tryResize / frozenSize 同源）。
    // 注意：setPosition 在 Windows 上会让窗口长 1px，所以这里用
    // setBounds 传固定内容宽高，移动的同时把尺寸钉住。
    const [w, h] = win.getContentSize();
    const frozen: [number, number] = this.frozenSize ?? [w, h];
    this.internalResize = true;
    win.setBounds(
      {
        x: Math.round(wa.x + wa.width - w),
        y: Math.round(wa.y + wa.height - h),
        width: frozen[0],
        height: frozen[1],
      },
      false,
    );
    this.internalResize = false;
    // 同步内部维护的位置，供后续拖拽累加
    this.dragPosX = Math.round(wa.x + wa.width - w);
    this.dragPosY = Math.round(wa.y + wa.height - h);
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
    // console.log('[main][FREEZE] setBounds', cur[0], 'x', cur[1], '→', this.frozenSize[0], 'x', this.frozenSize[1]);
    this.internalResize = true;
    win.setBounds(
      {
        x: this.dragPosX,
        y: this.dragPosY,
        // setBounds 的 w/h 是内容语义，与 frozenSize 同源，直接传
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
    if (win && !win.isDestroyed()) {
      // 冻结**内容尺寸**（与 setBounds 的参数同源）
      const content = win.getContentSize();
      this.frozenSize = [content[0], content[1]];

      // 位置从这里开始自己维护，不再每帧回读 getPosition()
      const pos = win.getPosition();
      this.dragPosX = pos[0];
      this.dragPosY = pos[1];

      // 用 setMinimumSize + setMaximumSize 把窗口锁死在 frozenSize
      win.setMinimumSize(this.frozenSize[0], this.frozenSize[1]);
      win.setMaximumSize(this.frozenSize[0], this.frozenSize[1]);
    }
  }

  /**
   * 拖拽期间的位移累加；同时把窗口挪过去。
   *
   * ★ 关键实现要点（修"长按拖拽时窗口不断变大"）★
   *
   * 现象：每帧调 `win.setPosition()`，窗口宽度每帧长 1px，60 帧能长 60px，
   *      停止拖拽后才被压回去 —— 正是用户反馈的"长按拖拽不停晃动就会变大"。
   *
   * 根因（探针实测确认，Windows 11 + Electron 33.4.11）：
   *  在 Windows 上，无边框窗口每次调用 `setPosition()` 都会让窗口的实际
   *  尺寸长 1px，且逐帧累积。原因是无边框窗口带 1px 不可见边框，
   *  而 setPosition 内部按内容矩形重算窗口矩形时把这 1px 算进去了。
   *  这与"有没有加 min/max 锁"无关 —— 裸调 setPosition 同样会漂。
   *
   * 修法：
   *  1. 拖拽全程**不再调用 setPosition**，改用 setBounds（内容语义）；
   *  2. 尺寸用**内容尺寸**做不变量（getContentSize），与 setBounds 参数同源；
   *  3. 位置自己维护（dragPosX/dragPosY），只累加不回读。
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
    win.setBounds(
      {
        x: Math.round(this.dragPosX),
        y: Math.round(this.dragPosY),
        // setBounds 的 w/h 是内容语义，与 frozenSize 同源
        width: this.frozenSize[0],
        height: this.frozenSize[1],
      },
      false,
    );
    this.internalResize = false;
  }

  /**
   * 结束拖拽：
   *  - 累计位移 < 阈值 → 长按微动，恢复默认位置模式 + 贴回右下
   *  - 否则标记为已离开默认位置
   *  - 解除 setMin/setMax 锁定
   *  - ★ 用 setBounds 强制把 size 设回 frozenSize（同时锁 position）——
   *    setBounds 比 setSize 在 Windows 上更"硬"，因为它一次性设 HWND 的全部属性。
   */
  endDrag(win: BrowserWindow): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    const movedDistance = Math.hypot(this.dragAccumDx, this.dragAccumDy);
    if (movedDistance < DRAG_LEAVE_THRESHOLD_PX) {
      this.atDefaultPosition = true;
      if (!win.isDestroyed()) this.alignToDefault(win);
    } else {
      this.atDefaultPosition = false;
    }
    if (!win.isDestroyed()) {
      // 解锁 setMin/setMax
      win.setMinimumSize(this.minSize, this.minSize);
      win.setMaximumSize(0, 0);
      // 用 setBounds 压回 frozenSize（同时锁 position，比 setSize 更"硬"）
      if (this.frozenSize) {
        const cur = win.getContentSize();
        if (cur[0] !== this.frozenSize[0] || cur[1] !== this.frozenSize[1]) {
          // console.log('[main][END-FREEZE] setBounds →', this.frozenSize[0], 'x', this.frozenSize[1]);
          this.internalResize = true;
          win.setBounds(
            {
              x: this.dragPosX,
              y: this.dragPosY,
              // setBounds 的 w/h 是内容语义，与 frozenSize 同源
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
   */
  private snapAfterResize(win: BrowserWindow): void {
    if (win.isDestroyed()) return;
    const wa = this.getWorkArea(win);
    // 内容尺寸（与 frozenSize / setBounds 同源）
    const [w, h] = win.getContentSize();
    let nx = this.atDefaultPosition ? wa.x + wa.width - w : win.getPosition()[0];
    let ny = this.atDefaultPosition ? wa.y + wa.height - h : win.getPosition()[1];
    if (nx < wa.x) nx = wa.x;
    if (ny < wa.y) ny = wa.y;
    if (nx + w > wa.x + wa.width) nx = wa.x + wa.width - w;
    if (ny + h > wa.y + wa.height) ny = wa.y + wa.height - h;
    if (nx !== win.getPosition()[0] || ny !== win.getPosition()[1]) {
      // 用 setBounds 而不是 setPosition —— setPosition 在 Windows 上会让窗口长 1px
      this.internalResize = true;
      win.setBounds(
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