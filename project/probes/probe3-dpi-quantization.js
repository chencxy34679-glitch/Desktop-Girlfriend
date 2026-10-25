/**
 * 探针 3 —— 定位"每帧 1px 抖动"的确切触发条件。
 *
 * 探针 2 已经排除：setBounds vs setContentBounds、min/max 锁的内容/外框单位，
 * 四种组合结果完全一样（内容原点最大误差 1px、外框尺寸 294↔295 翻转）。
 *
 * 新假设：**外框翻转只在"方向反转"时发生**。
 *   · 单向拖（一直往右）→ 外框稳定
 *   · 来回晃（+3,-3,+3,-3）→ 每次反转外框翻一次
 * 因为窗口"晃动"时每次反转内容原点会差 1px，
 * 角色在窗口内 1px 抖动 → 用户感知为"拖拽晃动时明显感觉到偏移"。
 *
 * 同时打印 display scaleFactor / 显示器分辨率，用于判断是否 DPI 舍入导致。
 */
const { app, BrowserWindow, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, 'result3-dpi.json');

app.whenReady().then(async () => {
  const W = 294;
  const H = 570;

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

  const display = screen.getPrimaryDisplay();

  /**
   * 跑一段位移序列，返回逐帧记录。
   * @param {Array<[number,number]>} deltas 每帧位移
   */
  const runSeq = async (deltas) => {
    // 复位
    win.setMaximumSize(0, 0);
    win.setMinimumSize(64, 64);
    win.setContentSize(W, H, false);
    win.setContentBounds({ x: 300, y: 200, width: W, height: H }, false);
    await new Promise((r) => setTimeout(r, 120));

    const init = { ...win.getContentBounds() };
    let posX = init.x;
    let posY = init.y;
    const frames = [];
    for (const [dx, dy] of deltas) {
      posX += dx;
      posY += dy;
      win.setContentBounds({ x: posX, y: posY, width: W, height: H }, false);
      const cb = win.getContentBounds();
      frames.push({
        请求位置: { x: posX, y: posY },
        实际内容原点: { x: cb.x, y: cb.y },
        误差: { x: cb.x - posX, y: cb.y - posY },
        外框尺寸: win.getSize(),
        内容尺寸: win.getContentSize(),
        外框尺寸文本: win.getSize().join('x'),
        内容原点文本: `${cb.x},${cb.y}`,
      });
    }
    await new Promise((r) => setTimeout(r, 150));
    return { init, frames };
  };

  const out = {
    显示器: {
      scaleFactor: display.scaleFactor,
      size: display.size,
      workArea: display.workArea,
    },
    窗口: { 内容尺寸: [W, H] },
    实验: {},
  };

  // ---- 实验 1：单向拖（一直 +3，60 帧）----
  {
    const seq = Array.from({ length: 60 }, () => [3, 0]);
    const r = await runSeq(seq);
    const errs = r.frames.map((f) => Math.max(Math.abs(f.误差.x), Math.abs(f.误差.y)));
    out.实验.单向拖 = {
      说明: '每帧 +3，60 帧，看外框尺寸是否稳定',
      内容原点最大误差: Math.max(...errs),
      外框尺寸取值: [...new Set(r.frames.map((f) => f.外框尺寸文本))],
      前12帧: r.frames.slice(0, 12).map((f) => ({
        请求: f.请求位置.x,
        实际: f.实际内容原点.x,
        误差: f.误差.x,
        外框: f.外框尺寸文本,
      })),
    };
  }

  // ---- 实验 2：来回晃（+3,-3 交替，60 帧）----
  {
    const seq = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? [3, 0] : [-3, 0]));
    const r = await runSeq(seq);
    const errs = r.frames.map((f) => Math.max(Math.abs(f.误差.x), Math.abs(f.误差.y)));
    out.实验.来回晃 = {
      说明: '每帧 +3/-3 交替，60 帧',
      内容原点最大误差: Math.max(...errs),
      外框尺寸取值: [...new Set(r.frames.map((f) => f.外框尺寸文本))],
      前12帧: r.frames.slice(0, 12).map((f) => ({
        请求: f.请求位置.x,
        实际: f.实际内容原点.x,
        误差: f.误差.x,
        外框: f.外框尺寸文本,
      })),
    };
  }

  // ---- 实验 3：±1 微晃（最贴近"长按轻晃"）----
  {
    const seq = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? [1, 0] : [-1, 0]));
    const r = await runSeq(seq);
    const errs = r.frames.map((f) => Math.max(Math.abs(f.误差.x), Math.abs(f.误差.y)));
    out.实验.正负1微晃 = {
      说明: '每帧 +1/-1 交替，40 帧',
      内容原点最大误差: Math.max(...errs),
      外框尺寸取值: [...new Set(r.frames.map((f) => f.外框尺寸文本))],
      前12帧: r.frames.slice(0, 12).map((f) => ({
        请求: f.请求位置.x,
        实际: f.实际内容原点.x,
        误差: f.误差.x,
        外框: f.外框尺寸文本,
      })),
    };
  }

  // ---- 实验 4：位置奇偶与外框尺寸的关系 ----
  {
    const seq = Array.from({ length: 20 }, (_, i) => [1, 0]);
    const r = await runSeq(seq);
    out.实验.逐像素右移 = {
      说明: '每帧 +1 连续右移 20 帧，看外框尺寸与位置奇偶的关系',
      帧: r.frames.map((f) => ({
        位置x: f.实际内容原点.x,
        误差: f.误差.x,
        外框: f.外框尺寸文本,
      })),
    };
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  app.exit(0);
});
