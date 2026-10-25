/**
 * 探针 5 —— 验证修复后的 window-state 行为。
 *
 * 验证三件事：
 *   T1 拖到别处后，"长按 + 轻晃(<12px)" **不再瞬移**回右下角（旧逻辑实测 706px）
 *   T2 原本就在右下角时，"长按 + 轻晃" 仍然弹回原地（这是要保留的行为）
 *   T3 拖拽全程内容尺寸恒定、位置跟手（≤1 DIP 量化误差）
 *
 * 加载的是**修复后的** src/main/window-state.ts（esbuild 现场打包）。
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { WindowState } = require('./.build/window-state.cjs');

const OUT = path.join(__dirname, 'result5-regression.json');
const W = 294;
const H = 570;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: W,
    height: H,
    show: true,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
  });
  await win.loadURL('data:text/html,<body style="margin:0"></body>');

  const ws = new WindowState();
  const out = {};

  // 把窗口放到工作区右下角（= 默认位置），并让 winState 认为它在默认位置
  const placeAtDefault = async () => {
    ws.resetToDefault(win);
    await new Promise((r) => setTimeout(r, 150));
  };

  // =================================================================
  // T1：先拖到别处（> 12px），再长按轻晃（< 12px）→ 应当**留在原地**
  // =================================================================
  {
    await placeAtDefault();
    const start = { ...win.getContentBounds() };

    // 第一段：明确拖走 200px
    ws.beginDrag(win);
    for (let i = 0; i < 20; i++) ws.moveByWhileDragging(win, -10, 0);
    ws.endDrag(win);
    await new Promise((r) => setTimeout(r, 200));
    const afterRealDrag = { ...win.getContentBounds() };

    // 第二段：长按轻晃（累计 8px < 12px 阈值）
    ws.beginDrag(win);
    for (let i = 0; i < 4; i++) {
      ws.moveByWhileDragging(win, 2, 0);
      ws.moveByWhileDragging(win, -2, 0);
    }
    ws.endDrag(win);
    await new Promise((r) => setTimeout(r, 200));
    const afterJiggle = { ...win.getContentBounds() };

    out.T1_拖到别处后长按轻晃 = {
      说明: '先拖走 200px，再长按轻晃 8px，窗口应留在拖走后位置，不该瞬移回右下角',
      初始位置: { x: start.x, y: start.y },
      明确拖动后: { x: afterRealDrag.x, y: afterRealDrag.y },
      长按轻晃后: { x: afterJiggle.x, y: afterJiggle.y },
      轻晃引起的位移: {
        x: afterJiggle.x - afterRealDrag.x,
        y: afterJiggle.y - afterRealDrag.y,
      },
      瞬移回默认位置的量: {
        x: afterJiggle.x - start.x,
        y: afterJiggle.y - start.y,
      },
      判定:
        Math.abs(afterJiggle.x - afterRealDrag.x) <= 2
          ? '✅ 留在原地，没有瞬移（修复生效）'
          : '❌ 仍然发生瞬移',
    };
  }

  // =================================================================
  // T2：原本就在右下角，长按轻晃 → 仍应弹回右下角
  // =================================================================
  {
    await placeAtDefault();
    const start = { ...win.getContentBounds() };
    ws.beginDrag(win);
    for (let i = 0; i < 4; i++) {
      ws.moveByWhileDragging(win, 2, 0);
      ws.moveByWhileDragging(win, -2, 0);
    }
    ws.endDrag(win);
    await new Promise((r) => setTimeout(r, 200));
    const after = { ...win.getContentBounds() };
    out.T2_默认位置长按轻晃 = {
      说明: '在右下角时长按轻晃，应弹回原地（保留原有行为）',
      初始位置: { x: start.x, y: start.y },
      轻晃后位置: { x: after.x, y: after.y },
      位移: { x: after.x - start.x, y: after.y - start.y },
      判定:
        Math.abs(after.x - start.x) <= 2 && Math.abs(after.y - start.y) <= 2
          ? '✅ 弹回原地，行为保留'
          : '❌ 没有弹回',
    };
  }

  // =================================================================
  // T3：拖拽全程 —— 内容尺寸恒定 + 位置跟手
  // =================================================================
  {
    await placeAtDefault();
    const init = { ...win.getContentBounds() };
    ws.beginDrag(win);
    let maxErr = 0;
    const contentSizes = new Set();
    let cx = init.x;
    let cy = init.y;
    for (let i = 0; i < 120; i++) {
      const dx = i % 2 === 0 ? 3 : -3;
      const dy = i % 4 < 2 ? 1 : -1;
      cx += dx;
      cy += dy;
      ws.moveByWhileDragging(win, dx, dy);
      const cb = win.getContentBounds();
      const err = Math.max(Math.abs(cb.x - cx), Math.abs(cb.y - cy));
      if (err > maxErr) maxErr = err;
      contentSizes.add(win.getContentSize().join('x'));
      if (i % 20 === 0) await new Promise((r) => setImmediate(r));
    }
    await new Promise((r) => setTimeout(r, 200));
    ws.endDrag(win);
    out.T3_拖拽全程 = {
      说明: '120 帧抖动，内容尺寸应恒定，位置误差应 ≤1 DIP',
      内容尺寸取值: [...contentSizes],
      内容尺寸恒定: contentSizes.size === 1,
      位置最大误差px: maxErr,
      判定:
        contentSizes.size === 1 && maxErr <= 1
          ? '✅ 尺寸恒定 + 跟手误差 ≤1px'
          : '⚠️ 有异常',
    };
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  app.exit(0);
});
