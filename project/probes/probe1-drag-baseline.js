/**
 * 拖拽探针 —— 回答用户的问题："长按拖拽晃动的感觉到偏移"是**窗口变大**还是**位置漂移**？
 *
 * 方法：直接加载生产代码 `src/main/window-state.ts`（用 esbuild 打成 cjs），
 *       复刻 index.ts 的调用序列，逐帧记录四组坐标：
 *         - getSize()        → 外框尺寸（窗口整体，含不可见边框）
 *         - getContentSize() → 内容尺寸（客户区）
 *         - getBounds()      → 外框位置
 *         - getContentBounds()→ 内容原点（客户区左上角）
 *
 *       并给 win.setBounds 打桩，记录每帧被调用了几次、参数是什么。
 *
 * 判定：
 *   尺寸漂移 = |contentSize(t) - contentSize(0)| > 0
 *   位置漂移 = |contentOrigin(t) - (contentOrigin(0) + cumDelta)| > 0.5
 *
 * 结论写进 tmp-probe/result.json（Electron 是 GUI 子系统，stdout 不落盘）。
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { WindowState } = require('./.build/window-state.cjs');

const OUT = path.join(__dirname, 'result1-baseline.json');
const log = [];

function snap(win, tag) {
  return {
    tag,
    size: win.getSize(),
    contentSize: win.getContentSize(),
    bounds: win.getBounds(),
    contentBounds: win.getContentBounds(),
    position: win.getPosition(),
  };
}

app.whenReady().then(async () => {
  // ---- 与生产完全一致的窗口参数 ----
  const win = new BrowserWindow({
    width: 293,
    height: 569,
    show: true,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: false },
  });
  await win.loadURL('data:text/html,<body style="margin:0;background:transparent"></body>');

  const winState = new WindowState();

  // ---- 给 setBounds 打桩：记录每次调用的参数与调用栈来源 ----
  const setBoundsCalls = [];
  const origSetBounds = win.setBounds.bind(win);
  win.setBounds = (b, animate) => {
    setBoundsCalls.push({ frame: winState.__frame ?? -1, bounds: { ...b }, animate });
    return origSetBounds(b, animate);
  };

  // ---- 生产同款 resize 守卫 ----
  win.on('resize', () => {
    winState.onExternalResize(win);
  });

  const scenarios = {};

  // =================================================================
  // 场景 A：长按微动（累计 < 12px 阈值）→ 验证 endDrag 是否弹回
  // =================================================================
  {
    const before = snap(win, 'A:before');
    winState.beginDrag(win);
    const afterBegin = snap(win, 'A:afterBeginDrag');
    // 微动：+2,-1,+2,-1,… 累计 8px（< DRAG_LEAVE_THRESHOLD_PX = 12）
    for (let i = 0; i < 4; i++) {
      winState.moveByWhileDragging(win, 2, 0);
      winState.moveByWhileDragging(win, -2, 0);
    }
    const beforeEnd = snap(win, 'A:beforeEndDrag');
    const callsBeforeEnd = setBoundsCalls.length;
    winState.endDrag(win);
    const afterEnd = snap(win, 'A:afterEndDrag');

    scenarios.A = {
      说明: '长按微动（累计 8px < 12px 阈值），endDrag 会走 alignToDefault 弹回',
      before,
      afterBegin,
      beforeEnd,
      afterEnd,
      endDrag期间的setBounds调用数: setBoundsCalls.length - callsBeforeEnd,
      endDrag期间的setBounds参数: setBoundsCalls.slice(callsBeforeEnd),
      弹回位移: {
        x: afterEnd.contentBounds.x - beforeEnd.contentBounds.x,
        y: afterEnd.contentBounds.y - beforeEnd.contentBounds.y,
      },
    };
  }

  // =================================================================
  // 场景 B：正常拖拽 200 帧（含左右抖动），检查尺寸 / 位置漂移
  // =================================================================
  {
    const before = snap(win, 'B:before');
    const initContentBounds = { ...before.contentBounds };
    winState.beginDrag(win);
    const afterBegin = snap(win, 'B:afterBeginDrag');

    const frames = [];
    let cumDx = 0;
    let cumDy = 0;
    const FRAMES = 200;
    for (let i = 0; i < FRAMES; i++) {
      // 抖动：左右来回，模拟用户"长按晃动"
      const dx = i % 2 === 0 ? 3 : -3;
      const dy = i % 4 < 2 ? 1 : -1;
      cumDx += dx;
      cumDy += dy;
      winState.moveByWhileDragging(win, dx, dy);
      // 让出事件循环，模拟真实的一帧（让 resize 事件有机会异步送达）
      if (i % 20 === 0) await new Promise((r) => setImmediate(r));
      frames.push({
        i,
        cumDx,
        cumDy,
        size: win.getSize(),
        contentSize: win.getContentSize(),
        contentBounds: win.getContentBounds(),
        bounds: win.getBounds(),
      });
    }
    // 等异步 resize 事件全部送达
    await new Promise((r) => setTimeout(r, 300));
    const last = frames[frames.length - 1];
    const finalSnap = snap(win, 'B:final');

    // 期望位置 = 初始内容原点 + 累计位移
    const expContentX = initContentBounds.x + cumDx;
    const expContentY = initContentBounds.y + cumDy;
    const expOuterX = before.bounds.x + cumDx;
    const expOuterY = before.bounds.y + cumDy;

    // 找出尺寸发生变化的帧
    const sizeChangedFrames = frames.filter(
      (f, i) =>
        i > 0 &&
        (f.contentSize[0] !== frames[i - 1].contentSize[0] ||
          f.contentSize[1] !== frames[i - 1].contentSize[1] ||
          f.size[0] !== frames[i - 1].size[0] ||
          f.size[1] !== frames[i - 1].size[1]),
    );

    // 找出位置偏离期望的帧
    const posDeviating = frames.filter(
      (f) =>
        Math.abs(f.contentBounds.x - (initContentBounds.x + f.cumDx)) > 0.5 ||
        Math.abs(f.contentBounds.y - (initContentBounds.y + f.cumDy)) > 0.5,
    );

    scenarios.B = {
      说明: '正常拖拽 200 帧（左右抖动），逐帧核对尺寸与位置',
      before,
      afterBegin,
      final: finalSnap,
      初始内容原点: initContentBounds,
      初始外框原点: { x: before.bounds.x, y: before.bounds.y },
      累计位移: { x: cumDx, y: cumDy },
      期望内容原点: { x: expContentX, y: expContentY },
      实际内容原点: finalSnap.contentBounds,
      内容原点偏差: {
        x: finalSnap.contentBounds.x - expContentX,
        y: finalSnap.contentBounds.y - expContentY,
      },
      期望外框原点: { x: expOuterX, y: expOuterY },
      实际外框原点: finalSnap.bounds,
      外框原点偏差: {
        x: finalSnap.bounds.x - expOuterX,
        y: finalSnap.bounds.y - expOuterY,
      },
      尺寸漂移: {
        内容尺寸: {
          初始: before.contentSize,
          最终: finalSnap.contentSize,
          变化: [
            finalSnap.contentSize[0] - before.contentSize[0],
            finalSnap.contentSize[1] - before.contentSize[1],
          ],
        },
        外框尺寸: {
          初始: before.size,
          最终: finalSnap.size,
          变化: [
            finalSnap.size[0] - before.size[0],
            finalSnap.size[1] - before.size[1],
          ],
        },
        尺寸发生变化的帧数: sizeChangedFrames.length,
        尺寸发生变化的帧: sizeChangedFrames.slice(0, 5),
      },
      位置偏离期望的帧数: posDeviating.length,
      位置偏离期望的帧样例: posDeviating.slice(0, 5),
      setBounds总调用数: setBoundsCalls.length,
      每帧平均setBounds次数: +(setBoundsCalls.length / (FRAMES + 3)).toFixed(2),
    };
  }

  // =================================================================
  // 场景 C：单次 setBounds 到底改的是「外框」还是「内容」
  // =================================================================
  {
    // 恢复到某个已知状态，直接验证单位语义
    const s0 = snap(win, 'C:before');
    win.setBounds({ x: 500, y: 300, width: 400, height: 300 }, false);
    const s1 = snap(win, 'C:afterSetBounds400x300');
    scenarios.C = {
      说明: 'setBounds({width:400,height:300}) 之后，看 getSize 与 getContentSize 各自变成多少 —— 判定 width/height 到底是外框还是内容语义',
      before: s0,
      after: s1,
      结论: {
        外框尺寸变成: s1.size,
        内容尺寸变成: s1.contentSize,
        判定: s1.size[0] === 400 ? 'setBounds 的 width/height 是【外框】语义' : 'setBounds 的 width/height 是【内容】语义',
        内容边框厚度: {
          左右: s1.bounds.width - s1.contentBounds.width,
          上下: s1.bounds.height - s1.contentBounds.height,
        },
      },
    };
  }

  // =================================================================
  // 场景 D：setPosition 到底会不会让窗口长 1px（复现旧 bug）
  // =================================================================
  {
    const s0 = snap(win, 'D:before');
    for (let i = 0; i < 30; i++) {
      win.setPosition(s0.bounds.x + i, s0.bounds.y, false);
    }
    const s1 = snap(win, 'D:after30xSetPosition');
    scenarios.D = {
      说明: '连续 30 次 setPosition，观察窗口尺寸是否每帧 +1px（复现旧 bug）',
      before: s0,
      after: s1,
      尺寸变化: {
        外框: [s1.size[0] - s0.size[0], s1.size[1] - s0.size[1]],
        内容: [s1.contentSize[0] - s0.contentSize[0], s1.contentSize[1] - s0.contentSize[1]],
      },
    };
  }

  fs.writeFileSync(OUT, JSON.stringify({ scenarios, setBoundsCalls: setBoundsCalls.slice(0, 40) }, null, 2));
  app.exit(0);
});
