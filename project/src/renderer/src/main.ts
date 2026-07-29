/**
 * Renderer 入口
 *
 * 流程：
 *  1. 启动 PixiJS 应用，背景透明，铺满 #pet-stage
 *  2. 通过 window.petApi 加载角色 config（含 Spine 三件套的相对路径）
 *  3. 加载 Spine 骨骼动画，构建 SpineCharacter 放到 stage 上
 *  4. 启动左键长按拖动 + 右键菜单 + 点击触发互动动画
 *  5. 通知主进程：按模型包围盒缩放窗口 + 对齐到任务栏上方
 *
 * 注意：眨眼、头发飘动这些以前靠粒子和蒙版模拟的效果，
 * 现在都由 Spine 的 idle 动画原生提供，不再需要外挂实现。
 */

import { Application, Container } from 'pixi.js';
// PixiJS v8 在严格 CSP 下需要显式导入 unsafe-eval 旁路模块，
// 否则启动会抛 "Current environment does not allow unsafe-eval"
// 必须在最顶部、且在 Application 导入前 import（模块注册副作用）。
import 'pixi.js/unsafe-eval';
import { SpineCharacter } from './spine-character';
import { setupDrag } from './drag';
import { setupContextMenu, registerMenuItem } from './menu';

/** 缩放上下限（右键菜单控制） */
const SCALE_MIN = 0.2;
const SCALE_MAX = 1.5;
const SCALE_STEP = 0.1;
const SCALE_DEFAULT = 0.5;

/** 随机播放互动动画的间隔范围（毫秒） */
const IDLE_MOTION_MIN_MS = 30_000;
const IDLE_MOTION_RANGE_MS = 60_000;

const STAGE_ID = 'pet-stage';
const CHARACTER_ID = 'roxy';

async function boot(): Promise<void> {
  const cfg = await window.petApi.loadCharacter(CHARACTER_ID);
  if (!cfg?.spine) {
    console.error('[renderer] failed to load character config or missing spine section');
    return;
  }
  // 把相对路径解析成绝对 URL，让 PIXI 能 fetch。
  // dev: http://localhost:port/spine/roxy/roxy.atlas
  // prod: file:///E:/.../out/renderer/spine/roxy/roxy.atlas
  // 中文等非 ASCII 文件名的 URL 编码走 URL 构造器，避免手拆 split 出错。
  const toAbsolute = (p: string): string =>
    new URL(p.split('/').map(encodeURIComponent).join('/'), document.baseURI).toString();
  const atlasUrl = toAbsolute(cfg.spine.atlasUrl);
  const jsonUrl = toAbsolute(cfg.spine.jsonUrl);

  // 创建 PixiJS v8 Application
  const app = new Application();
  await app.init({
    backgroundAlpha: 0, // 透明背景
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: document.getElementById(STAGE_ID) as HTMLElement,
    preference: 'webgl', // 强制 WebGL 走 WebGL2，避开 WebGPU 在透明窗口的渲染问题
  });
  const dom = app.canvas as HTMLCanvasElement;
  dom.style.display = 'block';
  document.getElementById(STAGE_ID)?.appendChild(dom);

  // 调试日志：dev tools 会显示
  console.log('[renderer] PIXI app init OK', {
    domSize: { w: dom.width, h: dom.height },
    stageSize: { w: app.renderer.width, h: app.renderer.height },
  });

  // 角色容器
  const root = new Container();
  app.stage.addChild(root);

  // 实例化角色
  let character: SpineCharacter;
  try {
    character = await SpineCharacter.create({
      atlasUrl,
      jsonUrl,
      idleAnim: cfg.spine.idleAnim,
      motionAnim: cfg.spine.motionAnim,
    });
    console.log('[renderer] spine character loaded', {
      size: character.imageSize,
      atlasUrl,
    });
  } catch (err) {
    console.error('[renderer] character load FAILED', { atlasUrl, jsonUrl, err });
    // 抛出去由 boot().catch 显示红色错误条，让你立刻看到失败而不是空白
    throw err;
  }
  root.addChild(character.container);

  // 初始缩放：从 config 读，没有就用默认值
  let currentScale = cfg.meta.displayScale ?? SCALE_DEFAULT;

  // 把窗口尺寸对齐到 imageSize * scale
  const applyScale = async (s: number): Promise<void> => {
    currentScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));
    root.scale.set(currentScale);
    const w = Math.max(64, Math.round(character.imageSize.width * currentScale));
    const h = Math.max(64, Math.round(character.imageSize.height * currentScale));
    await window.petApi.resizeWindow({ width: w, height: h });
    console.log('[renderer] scale →', currentScale.toFixed(2), 'window:', w, 'x', h);
  };
  await applyScale(currentScale);

  // 拖拽 + 菜单（先把右键菜单注册好菜单项，再 setupContextMenu 一次性挂事件）
  // 第三个参数是"短按且未拖动"的回调 —— 正好用来触发互动动画
  setupDrag(
    dom,
    () => {},
    () => {
      character.triggerTap?.();
    },
  );
  setupContextMenu(dom);

  // 右键菜单：缩放 + 退出
  registerMenuItem({
    id: 'shrink',
    label: '缩小 (-)',
    onSelect: () => applyScale(currentScale - SCALE_STEP),
  });
  registerMenuItem({
    id: 'enlarge',
    label: '放大 (+)',
    onSelect: () => applyScale(currentScale + SCALE_STEP),
  });
  registerMenuItem({
    id: 'reset-scale',
    label: '默认大小',
    onSelect: () => applyScale(SCALE_DEFAULT),
  });

  // 键盘快捷键：+ 放大，- 缩小，0 默认
  window.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') {
      void applyScale(currentScale + SCALE_STEP);
    } else if (e.key === '-' || e.key === '_') {
      void applyScale(currentScale - SCALE_STEP);
    } else if (e.key === '0') {
      void applyScale(SCALE_DEFAULT);
    }
  });

  // ticker：Spine 的 autoUpdate 已关闭，由这里统一驱动
  app.ticker.add((ticker) => {
    character.tick(ticker.deltaMS);
  });

  // 闲置时每隔 30~90s 随机播一次互动动画，让角色不至于一直只有 idle。
  // triggerTap 内部也会挡住重复触发，这里再查一次是为了不打断用户刚点出来的动画。
  const scheduleRandomMotion = (): void => {
    window.setTimeout(
      () => {
        if (!character.isMotionPlaying?.()) character.triggerTap?.();
        scheduleRandomMotion();
      },
      IDLE_MOTION_MIN_MS + Math.random() * IDLE_MOTION_RANGE_MS,
    );
  };
  scheduleRandomMotion();

  // ready-to-show 后通知主进程对齐
  await window.petApi.realignWindow();
}

boot().catch((err) => {
  console.error('[renderer] boot failed', err);
  // 在画面上用红色标题显示错误，方便不打开 DevTools 也能看到
  const stage = document.getElementById(STAGE_ID);
  if (stage) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; inset: 0 0 auto 0;
      padding: 16px 20px;
      background: rgba(180, 30, 30, 0.92);
      color: #fff;
      font: 14px/1.5 -apple-system, "Microsoft YaHei", sans-serif;
      white-space: pre-wrap;
      z-index: 99999;
    `;
    banner.textContent = `[renderer] boot failed: ${(err as Error)?.message ?? err}`;
    stage.appendChild(banner);
  }
});
