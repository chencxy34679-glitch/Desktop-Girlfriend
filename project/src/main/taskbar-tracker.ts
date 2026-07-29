/**
 * 任务栏跟踪器 — 仅做"启动首对齐"，不主动打扰用户。
 *
 * 旧版本会监听 display-metrics-changed + 1.5s 周期定时器。
 * 但用户拖动窗口经过屏幕底部时，Windows 自动显示任务栏会改变 workArea，
 * 那时 TaskbarTracker 会把窗口重新拉回右下角，造成肉眼可见的闪烁。
 *
 * 新规则：
 *  - 启动时一次性把窗口对齐到当前 display 的工作区右下角
 *  - 只在 display added / removed（新增物理显示器）时再次对齐
 *  - 不再监听 metrics change（分辨率 / 任务栏自动隐藏导致的 workArea 缩放）
 *  - 不再有 setInterval 周期跳
 * 用户的窗口位置由用户拖动决定，不被自动接管。
 */

import { BrowserWindow, screen } from 'electron';

export class TaskbarTracker {
  constructor(private readonly win: BrowserWindow) {}

  start(): void {
    this.alignOnce();
    screen.on('display-added', () => this.alignOnce());
    screen.on('display-removed', () => this.alignOnce());
  }

  stop(): void {
    screen.removeAllListeners('display-added');
    screen.removeAllListeners('display-removed');
  }

  /**
   * 把窗口对齐到主 display 工作区右下角。
   * 注意：调用方先确认窗口尺寸已完成。
   */
  alignOnce(): void {
    if (this.win.isDestroyed()) return;
    const display = screen.getPrimaryDisplay();
    const wa = display.workArea;
    const [w, h] = this.win.getSize();
    const x = wa.x + wa.width - w;
    const y = wa.y + wa.height - h;
    this.win.setPosition(x, y, false);
  }
}
