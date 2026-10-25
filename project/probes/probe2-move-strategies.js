/**
 * 探针 2 —— 对比三种"拖拽移动窗口"方案，选出不会抖的那个。
 *
 * 探针 1 已经证明（生产代码真实跑 200 帧）：
 *   · 内容尺寸恒定 294×570          → 角色可见大小不变
 *   · 内容原点偏差 {0,0}            → 没有累积漂移
 *   · 但外框尺寸每帧在 294↔295 跳  → 不可见边框在"翻"
 *   · 且 100 帧的内容原点有 1px 误差 → 角色每帧抖 1px
 *
 * 怀疑根因：setBounds 的 width/height 与 getContentSize() 不是同一单位
 *           （Electron 文档：setBounds 是"窗口"bounds，getContentSize 是"客户区"尺寸），
 *           再叠加 beginDrag 里用**内容**尺寸去设 setMinimumSize/setMaximumSize
 *           （这两个是**窗口**尺寸语义），导致每帧边框在有无之间翻转。
 *
 * 本探针对比：
 *   S1 现状    setBounds(contentW/H) + min/max 锁 content 尺寸
 *   S2 改良    setContentBounds(contentW/H) + min/max 锁 **外框**尺寸
 *   S3 改良    setContentBounds(contentW/H) + 不锁 min/max
 *
 * 指标：
 *   内容原点最大误差 = max |contentBounds - (初始 + 累计位移)|
 *   内容尺寸是否恒定
 *   外框尺寸出现过的不同取值个数（1 = 稳定）
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, 'result2-strategies.json');
const W = 294;
const H = 570;
const FRAMES = 200;

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

  const results = {};

  const runStrategy = async (name, opts) => {
    // 每种策略前先把窗口恢复到干净状态
    win.setMaximumSize(0, 0);
    win.setMinimumSize(64, 64);
    win.setContentSize(W, H, false);
    win.setContentBounds({ x: 300, y: 200, width: W, height: H }, false);
    await new Promise((r) => setTimeout(r, 120));

    const init = {
      contentBounds: { ...win.getContentBounds() },
      contentSize: win.getContentSize(),
      size: win.getSize(),
    };

    // ── beginDrag 等价动作 ──
    let frozenW = init.contentSize[0];
    let frozenH = init.contentSize[1];
    let posX = init.contentBounds.x;
    let posY = init.contentBounds.y;
    if (opts.lock === 'content') {
      win.setMinimumSize(frozenW, frozenH);
      win.setMaximumSize(frozenW, frozenH);
    } else if (opts.lock === 'outer') {
      const outer = win.getSize();
      win.setMinimumSize(outer[0], outer[1]);
      win.setMaximumSize(outer[0], outer[1]);
    }
    await new Promise((r) => setTimeout(r, 60));

    const afterBegin = {
      contentBounds: { ...win.getContentBounds() },
      contentSize: win.getContentSize(),
      size: win.getSize(),
    };

    // ── 200 帧左右抖动 ──
    let cumX = 0;
    let cumY = 0;
    let maxErr = 0;
    const outerSizes = new Set();
    const contentSizes = new Set();
    for (let i = 0; i < FRAMES; i++) {
      const dx = i % 2 === 0 ? 3 : -3;
      const dy = i % 4 < 2 ? 1 : -1;
      cumX += dx;
      cumY += dy;
      posX = init.contentBounds.x + cumX;
      posY = init.contentBounds.y + cumY;

      if (opts.move === 'setBounds') {
        win.setBounds({ x: posX, y: posY, width: frozenW, height: frozenH }, false);
      } else {
        win.setContentBounds({ x: posX, y: posY, width: frozenW, height: frozenH }, false);
      }

      const cb = win.getContentBounds();
      const err = Math.max(
        Math.abs(cb.x - posX),
        Math.abs(cb.y - posY),
      );
      if (err > maxErr) maxErr = err;
      outerSizes.add(win.getSize().join('x'));
      contentSizes.add(win.getContentSize().join('x'));
      if (i % 20 === 0) await new Promise((r) => setImmediate(r));
    }
    await new Promise((r) => setTimeout(r, 200));

    const finalSnap = {
      contentBounds: { ...win.getContentBounds() },
      contentSize: win.getContentSize(),
      size: win.getSize(),
    };
    const finalCb = win.getContentBounds();
    const finalErr = Math.max(
      Math.abs(finalCb.x - posX),
      Math.abs(finalCb.y - posY),
    );

    results[name] = {
      方案: opts.desc,
      初始: init,
      beginDrag后: afterBegin,
      最终: finalSnap,
      内容原点最大误差px: maxErr,
      最终内容原点误差px: finalErr,
      内容尺寸出现过的取值: [...contentSizes],
      外框尺寸出现过的取值: [...outerSizes],
      内容尺寸是否恒定: contentSizes.size === 1,
      外框尺寸是否恒定: outerSizes.size === 1,
    };

    win.setMaximumSize(0, 0);
    win.setMinimumSize(64, 64);
  };

  await runStrategy('S1_现状_setBounds_锁内容尺寸', {
    desc: 'setBounds(contentW/H) + setMin/setMax(内容尺寸) —— 当前生产代码',
    move: 'setBounds',
    lock: 'content',
  });

  await runStrategy('S2_setContentBounds_锁外框尺寸', {
    desc: 'setContentBounds(contentW/H) + setMin/setMax(外框尺寸)',
    move: 'setContentBounds',
    lock: 'outer',
  });

  await runStrategy('S3_setContentBounds_不锁', {
    desc: 'setContentBounds(contentW/H) + 不设 setMin/setMax',
    move: 'setContentBounds',
    lock: 'none',
  });

  await runStrategy('S4_setBounds_锁外框尺寸', {
    desc: 'setBounds(contentW/H) + setMin/setMax(外框尺寸) —— 只改锁，不改移动方式',
    move: 'setBounds',
    lock: 'outer',
  });

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  app.exit(0);
});
