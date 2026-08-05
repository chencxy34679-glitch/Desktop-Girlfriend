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
   * 拖拽起始时的窗口 size —— 拖拽期间任何 resize 事件（包括 Windows 系统
   * 的 Snap Layout / Aero Snap / DPI 调整）都会被强制调回这个 size。
   */
  private frozenSize: [number, number] | null = null;
  /**
   * 我们自己的 setSize / setBounds 在执行期间设 true，resize event 看到 true 就跳过，
   * 避免 freeze → setSize → resize → freeze 死循环。
   */
  private internalResize = false;

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
    const [w, h] = win.getSize();
    win.setPosition(
      Math.round(wa.x + wa.width - w),
      Math.round(wa.y + wa.height - h),
      false,
    );
  }

  /**
   * 调整窗口尺寸（同步路径）。
   * 拖拽期间**直接拒绝**：不挂起、不应用、不修改任何 state。
   */
  tryResize(win: BrowserWindow, w: number, h: number): boolean {
    if (win.isDestroyed()) return false;
    if (this.isDragging) {
      // console.log('[main][REJECT] tryResize during drag → keep current size:', w, 'x', h);
      return false;
    }
    const ww = Math.max(this.minSize, Math.floor(w));
    const hh = Math.max(this.minSize, Math.floor(h));
    const cur = win.getSize();
    if (cur[0] === ww && cur[1] === hh) {
      return true;
    }
    // console.log('[main][setSize]', cur[0], 'x', cur[1], '→', ww, 'x', hh);
    this.internalResize = true;
    win.setMinimumSize(this.minSize, this.minSize);
    win.setSize(ww, hh, false);
    this.internalResize = false;
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
    const cur = win.getSize();
    if (cur[0] === this.frozenSize[0] && cur[1] === this.frozenSize[1]) return;
    const pos = win.getPosition();
    // console.log('[main][FREEZE] setBounds', cur[0], 'x', cur[1], '→', this.frozenSize[0], 'x', this.frozenSize[1]);
    this.internalResize = true;
    win.setBounds(
      {
        x: pos[0],
        y: pos[1],
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
      const sz = win.getSize();
      this.frozenSize = [sz[0], sz[1]];
      // 用 setMinimumSize + setMaximumSize 把窗口锁死在 frozenSize
      win.setMinimumSize(this.frozenSize[0], this.frozenSize[1]);
      win.setMaximumSize(this.frozenSize[0], this.frozenSize[1]);
    }
  }

  /** 拖拽期间的位移累加；同时把窗口挪过去 */
  moveByWhileDragging(win: BrowserWindow, dx: number, dy: number): void {
    if (win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    win.setPosition(Math.round(x + dx), Math.round(y + dy), false);
    this.dragAccumDx += dx;
    this.dragAccumDy += dy;
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
        const cur = win.getSize();
        if (cur[0] !== this.frozenSize[0] || cur[1] !== this.frozenSize[1]) {
          const pos = win.getPosition();
          // console.log('[main][END-FREEZE] setBounds →', this.frozenSize[0], 'x', this.frozenSize[1]);
          this.internalResize = true;
          win.setBounds(
            {
              x: pos[0],
              y: pos[1],
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
    const [w, h] = win.getSize();
    let nx = this.atDefaultPosition ? wa.x + wa.width - w : win.getPosition()[0];
    let ny = this.atDefaultPosition ? wa.y + wa.height - h : win.getPosition()[1];
    if (nx < wa.x) nx = wa.x;
    if (ny < wa.y) ny = wa.y;
    if (nx + w > wa.x + wa.width) nx = wa.x + wa.width - w;
    if (ny + h > wa.y + wa.height) ny = wa.y + wa.height - h;
    if (nx !== win.getPosition()[0] || ny !== win.getPosition()[1]) {
      win.setPosition(Math.round(nx), Math.round(ny), false);
    }
  }
}