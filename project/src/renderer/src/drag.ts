/**
 * 桌面宠物拖拽支持（修缮版）
 *
 * 行为：
 *  - 左键按住并移动 ≥ DRAG_THRESHOLD_PX → 进入拖拽模式；
 *    pointerdown 一次性通知主进程 `notifyDragStart()`，
 *    pointerup / pointercancel 一次性通知 `notifyDragEnd()`。
 *  - 每个 rAF flush 把单帧累计位移通过 `moveBy` 推过去。
 *  - 短按（移动 < 阈值）→ 视为 "tap"，交给 onTap 回调。
 *
 * 关键修缮（对应用户反馈的"长按拖拽晃动时窗口会不断变大"）：
 *  1. 拖拽期间 renderer 的 keydown 缩放（+/-/0）整段禁用；
 *  2. 拖拽期间主进程把 setSize 挂起，drag-end 时再合并（主进程侧已就绪）。
 *
 * 为什么 drag-end 时 moveBy 通知是"drag-end"而不是"立即退出"：
 *  - 主进程维护 isDragging 锁；同时累计位移；
 *  - 累计位移 < DRAG_LEAVE_THRESHOLD_PX 时（即"长按微动"）视为仍在默认位置，
 *    drag-end 时重置回默认位置；这是修"点击默认位置失效"的关键。
 *
 * 坐标系：用 PointerEvent.screenX/screenY（屏幕绝对坐标），避免窗口跟随位移后
 *  clientX 漂移造成的视觉抖动。
 */

type MoveCallback = (dx: number, dy: number) => void;
type TapCallback = () => void;
type DragStateChangedCallback = (dragging: boolean) => void;

/** 拖拽实时统计（调试仪表盘消费） */
export interface DragStats {
  /** 当前是否在拖拽 */
  dragging: boolean;
  /** 抓取瞬间，光标相对窗口原点的偏移 */
  grabOffsetX: number;
  grabOffsetY: number;
  /** 当前光标相对窗口原点的偏移 */
  cursorOffsetX: number;
  cursorOffsetY: number;
  /** 累计位移 */
  accumDx: number;
  accumDy: number;
}

const DRAG_THRESHOLD_PX = 1;
const HOLD_TIME_THRESHOLD_MS = 180;

export interface SetupDragOptions {
  onMove?: MoveCallback;
  onTap?: TapCallback;
  /**
   * 当进入/退出拖拽期触发；renderer 可借此屏蔽 keyboard 缩放、隐藏菜单等。
   * 这个钩子**先于** moveBy 上报主进程 —— 这样在同步渲染回调里屏蔽快捷键
   * 不会有"已经发了 setSize 才禁键盘"的竞态。
   */
  onDragStateChanged?: DragStateChangedCallback;
}

export interface DragController {
  /** 当前是否在拖拽中（renderer 视角） */
  readonly isDragging: boolean;
  /** 当前按下的时间戳（ms），未按下时为 0 */
  pressStart: number;
  /**
   * 拖拽实时统计（供调试仪表盘使用）。
   *
   * 关键量是"光标相对窗口原点的偏移"：
   *  - 抓取瞬间记下 grabOffsetX/Y；
   *  - 拖拽过程中 cursorOffsetX/Y 应该**一直等于** grabOffsetX/Y
   *    （窗口完全跟手时，角色在光标下的相对位置不会变）。
   *  - 两者出现差值，就说明窗口没完全跟手（滞后 / 量化 / 被弹回）。
   */
  readonly stats: DragStats;
  dispose: () => void;
}

export function setupDrag(
  canvas: HTMLElement,
  opts: SetupDragOptions = {},
): DragController {
  const { onMove = () => {}, onTap, onDragStateChanged = () => {} } = opts;

  let dragging = false;
  let armed = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let pressStart = 0;
  let captured = false;
  let didDrag = false;

  // 调试仪表盘用的实时统计（生产逻辑不依赖它）
  const stats: DragStats = {
    dragging: false,
    grabOffsetX: 0,
    grabOffsetY: 0,
    cursorOffsetX: 0,
    cursorOffsetY: 0,
    accumDx: 0,
    accumDy: 0,
  };

  /** 光标相对窗口左上角的偏移（DIP） */
  const cursorOffset = (e: PointerEvent): { x: number; y: number } => ({
    x: Math.round(e.screenX - window.screenX),
    y: Math.round(e.screenY - window.screenY),
  });

  // rAF 节流的位移累积
  let pendingDx = 0;
  let pendingDy = 0;
  let rafId = 0;

  const flushMove = (): void => {
    rafId = 0;
    if (pendingDx === 0 && pendingDy === 0) return;
    const dx = pendingDx;
    const dy = pendingDy;
    pendingDx = 0;
    pendingDy = 0;
    stats.accumDx += dx;
    stats.accumDy += dy;
    onMove(dx, dy);
    void window.petApi.moveBy({ dx, dy });
  };

  const setDragging = (next: boolean): void => {
    if (dragging === next) return;
    dragging = next;
    stats.dragging = next;
    if (next) {
      document.body.classList.add('dragging');
    } else {
      document.body.classList.remove('dragging');
    }
    onDragStateChanged(next);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // 仅左键
    startX = lastX = e.screenX;
    startY = lastY = e.screenY;
    armed = true;
    setDragging(false);
    didDrag = false;
    pressStart = performance.now();
    pendingDx = 0;
    pendingDy = 0;
    // 记录抓取瞬间光标相对窗口原点的偏移 —— 拖拽过程中它应当保持不变
    const off = cursorOffset(e);
    stats.grabOffsetX = off.x;
    stats.grabOffsetY = off.y;
    stats.cursorOffsetX = off.x;
    stats.cursorOffsetY = off.y;
    stats.accumDx = 0;
    stats.accumDy = 0;
    try {
      canvas.setPointerCapture(e.pointerId);
      captured = true;
    } catch {
      captured = false;
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!armed) return;
    const off = cursorOffset(e);
    stats.cursorOffsetX = off.x;
    stats.cursorOffsetY = off.y;
    const totalDx = e.screenX - startX;
    const totalDy = e.screenY - startY;
    if (!dragging && Math.hypot(totalDx, totalDy) > DRAG_THRESHOLD_PX) {
      // 第一次跨阈值时通知主进程开始拖拽
      setDragging(true);
      void window.petApi.notifyDragStart();
    }
    if (dragging) {
      const stepDx = e.screenX - lastX;
      const stepDy = e.screenY - lastY;
      lastX = e.screenX;
      lastY = e.screenY;
      didDrag = true;
      if (stepDx !== 0 || stepDy !== 0) {
        pendingDx += stepDx;
        pendingDy += stepDy;
        if (rafId === 0) {
          rafId = requestAnimationFrame(flushMove);
        }
      }
    }
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!armed) return;
    armed = false;
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      flushMove();
    }
    if (captured) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      captured = false;
    }
    if (dragging) {
      setDragging(false);
      // 通知主进程：拖拽结束，主进程会用累计位移判断要不要回默认位置
      void window.petApi.notifyDragEnd();
    } else if (!didDrag) {
      onTap?.();
    }
    void pressStart;
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (!armed) return;
    armed = false;
    if (dragging) {
      setDragging(false);
      void window.petApi.notifyDragEnd();
    }
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    pendingDx = 0;
    pendingDy = 0;
    if (captured) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      captured = false;
    }
  };

  const onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('contextmenu', onContextMenu);

  const controller: DragController = {
    get isDragging(): boolean {
      return dragging;
    },
    pressStart: 0,
    stats,
    dispose: () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    },
  };
  return controller;
}

export function isHoldGesture(pressStartMs: number, nowMs = performance.now()): boolean {
  return nowMs - pressStartMs >= HOLD_TIME_THRESHOLD_MS;
}
