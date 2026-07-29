/**
 * 桌面宠物拖拽支持
 *
 * 行为：
 *  - 左键按住并移动 ≥ 5px → 进入拖拽模式，调用 window.petApi.moveBy 推位移
 *  - 抬起左键 → 退出拖拽
 *  - 单纯的短按（移动 < 5px）→ 视为 "tap"，交由 onTap 回调（后续加交互用）
 *
 * 注意：桌面宠物让整个窗口都接收鼠标（不做点击穿透），所以我们只
 * 关心 canvas 上的 pointerdown / pointermove / pointerup。
 */

type MoveCallback = (dx: number, dy: number) => void;
type TapCallback = () => void;

const DRAG_THRESHOLD_PX = 5;
const HOLD_TIME_THRESHOLD_MS = 180;

export function setupDrag(
  canvas: HTMLCanvasElement,
  onMove: MoveCallback,
  onTap?: TapCallback,
): { dispose: () => void } {
  let dragging = false;
  let armed = false; // 没到阈值前的状态
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let pressTimer: number | null = null;
  let captured = false;
  let didDrag = false;

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // 仅左键
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    armed = true;
    dragging = false;
    didDrag = false;
    canvas.setPointerCapture(e.pointerId);
    captured = true;
    pressTimer = window.setTimeout(() => {
      // 长按达到阈值 → 也进入"armed 准备"
      // 真正是否进入 drag 仍要看后续位移
      pressTimer = null;
    }, HOLD_TIME_THRESHOLD_MS);
  };

  // drag 期间累积 dx/dy，每帧（rAF）只发一次 IPC + 应用一次 setPosition
  // 避免快拖时 100+ 次同步 IPC 堆积引发抖动
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
    onMove(dx, dy);
    void window.petApi.moveBy({ dx, dy });
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!armed) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      dragging = true;
      document.body.classList.add('dragging');
    }
    if (dragging) {
      const stepDx = e.clientX - lastX;
      const stepDy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      didDrag = true;
      // 累积到下一帧
      pendingDx += stepDx;
      pendingDy += stepDy;
      if (rafId === 0) {
        rafId = requestAnimationFrame(flushMove);
      }
    }
    // 阻止触屏默认滚动
    e.preventDefault();
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!armed) return;
    armed = false;
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (captured) {
      canvas.releasePointerCapture(e.pointerId);
      captured = false;
    }
    // 抬起时把本帧还没 flush 的位移冲掉，确保窗口位移一致
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      flushMove();
    }
    if (dragging) {
      dragging = false;
      document.body.classList.remove('dragging');
    } else if (!didDrag) {
      // 单纯短按 → tap，留给后续扩展
      onTap?.();
    }
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (!armed) return;
    armed = false;
    dragging = false;
    document.body.classList.remove('dragging');
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
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

  // 阻止浏览器默认的右键菜单（避免污染 + 我们自己处理 contextmenu）
  const onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
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
}
