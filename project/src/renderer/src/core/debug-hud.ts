/**
 * 调试仪表盘（仅开发环境 / F9 开关）
 *
 * ── 为什么需要它 ────────────────────────────────────────────────────
 * 用户反馈"长按拖拽晃动能明显感觉到偏移"，但**无法分辨**到底是
 *   (a) 窗口真的变大了，还是
 *   (b) 窗口位置相对光标有偏移。
 *
 * 本地探针（Electron 33.4.11 / Win11 / 150% DPI）已经测出事实：
 *   · 内容尺寸恒定（角色可见大小不变）
 *   · 外框会在 294↔295 之间逐帧翻转（不可见边框，1.5 物理像素）
 *   · 位置在 150% DPI 下被量化到偶数 DIP（请求 303 实际落在 302）
 *   · 旧逻辑在"长按微动"时会把窗口瞬移回右下角（探针实测 706px）
 *
 * 但探针跑不了真实鼠标操作，所以这里把关键数字实时显示出来，
 * 让用户**自己看**就能分辨：
 *   · 外框 / 内容尺寸分开显示 → 一眼看出是不是"真的变大了"
 *   · 光标相对窗口原点的偏移（抓取值 vs 当前值）→ 一眼看出是不是"跟手"
 *   · 累计位移 → 和肉眼感觉对得上
 *
 * 全部数据来自 renderer 侧的 window.outerWidth / innerWidth / screenX，
 * 不需要额外 IPC。
 */

/** 拖拽相关的实时统计，由 setupDrag 填充 */
export interface DragStats {
  /** 当前是否在拖拽 */
  dragging: boolean;
  /** 抓取瞬间，光标相对窗口原点的偏移 */
  grabOffsetX: number;
  grabOffsetY: number;
  /** 当前光标相对窗口原点的偏移 */
  cursorOffsetX: number;
  cursorOffsetY: number;
  /** 累计位移（主进程与 renderer 一致的累加值） */
  accumDx: number;
  accumDy: number;
}

export interface DebugHud {
  /** 传入拖拽统计源；每次刷新时读取 */
  setStatsSource(fn: () => DragStats): void;
  destroy(): void;
}

const HUD_STYLE = `
  position: fixed;
  left: 6px;
  top: 6px;
  z-index: 2147483647;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.72);
  color: #b9f5c8;
  font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0,0,0,.8);
`;

export function createDebugHud(): DebugHud {
  const el = document.createElement('div');
  el.id = 'dg-debug-hud';
  el.style.cssText = HUD_STYLE;
  el.style.display = 'none';
  document.body.appendChild(el);

  let statsSource: () => DragStats | null = () => null;
  let visible = false;
  let rafId = 0;

  const render = (): void => {
    rafId = requestAnimationFrame(render);
    if (!visible) return;

    const s = statsSource();
    const outer = `${window.outerWidth}×${window.outerHeight}`;
    const inner = `${window.innerWidth}×${window.innerHeight}`;
    const dpr = window.devicePixelRatio || 1;

    let dragLine = '拖拽 —';
    if (s) {
      const ddx = s.cursorOffsetX - s.grabOffsetX;
      const ddy = s.cursorOffsetY - s.grabOffsetY;
      dragLine =
        `拖拽 ${s.dragging ? '●' : '○'}  ` +
        `光标偏移 ${s.cursorOffsetX},${s.cursorOffsetY}  ` +
        `Δ ${ddx >= 0 ? '+' : ''}${ddx},${ddy >= 0 ? '+' : ''}${ddy}\n` +
        `     抓取时 ${s.grabOffsetX},${s.grabOffsetY}   累计 ${s.accumDx >= 0 ? '+' : ''}${s.accumDx},${s.accumDy >= 0 ? '+' : ''}${s.accumDy}`;
    }

    el.textContent =
      `外框 ${outer}   内容 ${inner}   DPR ${dpr}\n` +
      `窗口原点 ${window.screenX},${window.screenY}\n` +
      dragLine;
  };
  rafId = requestAnimationFrame(render);

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'F9') return;
    e.preventDefault();
    visible = !visible;
    el.style.display = visible ? 'block' : 'none';
  };
  window.addEventListener('keydown', onKey);

  return {
    setStatsSource(fn: () => DragStats): void {
      statsSource = fn;
    },
    destroy(): void {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}

/**
 * 是否是开发环境。
 * electron-vite 开发时 renderer 跑在 http://localhost:xxxx，
 * 打包后走 file:// 加载 —— 用协议判断最稳，不依赖 import.meta.env 的类型声明。
 */
export function isDevRenderer(): boolean {
  return location.protocol !== 'file:';
}
