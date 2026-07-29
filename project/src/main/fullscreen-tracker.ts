/**
 * 全屏跟踪器（无 active-win 依赖版）
 *
 * 实现：
 *  - 周期性用 PowerShell + Win32 API 拉一次前台窗口的 (x,y,w,h,title)
 *  - 如果前台窗口的覆盖范围等于某一 display 的 bounds（注意是 bounds 不是 workArea，
 *    即包含任务栏），就视为全屏 → 隐藏宠物
 *
 * 为什么不用 native 库？
 *  - active-win 等需要 .node 原生模块，国内 GitHub releases 下载慢、易失败
 *  - PowerShell + Win32 是 Windows 内建能力，0 依赖
 *
 * 性能：
 *  - PowerShell 进程启动约 200-400ms
 *  - 1 秒 1 次，对桌面宠物场景 CPU 占用可忽略
 *  - 如果追求更高频，可以缓存 ps1 脚本到临时目录，去掉 -NoProfile 解析开销
 */

import { BrowserWindow, screen } from 'electron';
import { spawn } from 'node:child_process';

interface ForegroundInfo {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const POWERSHELL_GET_FOREGROUND = `
$src = @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class FG {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
Add-Type -TypeDefinition $src -Language CSharp
$h = [FG]::GetForegroundWindow()
if ($h -eq [IntPtr]::Zero) { exit 1 }
$r = New-Object FG+RECT
[void][FG]::GetWindowRect($h, [ref]$r)
$sb = New-Object System.Text.StringBuilder 256
[void][FG]::GetWindowText($h, $sb, $sb.Capacity)
$rect = @{
  x = $r.L
  y = $r.T
  w = $r.R - $r.L
  h = $r.B - $r.T
  title = $sb.ToString()
}
$rect | ConvertTo-Json -Compress
`;

function getForegroundViaPowerShell(): Promise<ForegroundInfo | null> {
  return new Promise((resolve) => {
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_GET_FOREGROUND],
      { windowsHide: true, shell: false },
    );
    let out = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.stderr.on('data', () => {
      /* 忽略 */
    });
    proc.on('error', () => resolve(null));
    proc.on('close', () => {
      const text = out.trim();
      if (!text) return resolve(null);
      try {
        const parsed = JSON.parse(text);
        resolve({
          title: String(parsed.title ?? ''),
          x: Number(parsed.x) || 0,
          y: Number(parsed.y) || 0,
          w: Number(parsed.w) || 0,
          h: Number(parsed.h) || 0,
        });
      } catch {
        resolve(null);
      }
    });
  });
}

export class FullscreenTracker {
  private timer: NodeJS.Timeout | null = null;
  private hidden = false;
  private lastTitle = '';
  private pending = false;

  constructor(private readonly win: BrowserWindow) {}

  start(intervalMs = 1200): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.win.isDestroyed()) return;
    if (this.pending) return; // 上一轮还没回来，跳过
    this.pending = true;
    try {
      const fg = await getForegroundViaPowerShell();
      if (!fg || fg.w === 0 || fg.h === 0) {
        this.setHidden(false);
        return;
      }
      // 过滤我们自己窗口
      if (fg.title === this.lastTitle && this.hidden) {
        return;
      }
      this.lastTitle = fg.title;

      const target = screen.getDisplayMatching(this.win.getBounds());
      const { x, y, width, height } = target.bounds;
      const covers =
        fg.x <= x &&
        fg.y <= y &&
        fg.x + fg.w >= x + width &&
        fg.y + fg.h >= y + height;

      this.setHidden(!!covers);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[fullscreen-tracker] tick error:', err);
    } finally {
      this.pending = false;
    }
  }

  private setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) this.win.hide();
    else this.win.showInactive();
  }
}
