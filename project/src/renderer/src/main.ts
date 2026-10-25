/**
 * Renderer 入口
 *
 * 装配顺序：
 *  1. 启动 PixiJS 应用（透明背景，覆盖 #pet-stage）
 *  2. 创建 EventBus
 *  3. 创建 CharacterManager / ChatAdapter / TtsAdapter / SpeechBubble
 *  4. 启动拖拽（带 onDragStateChanged 钩子，回调中标记 isDragging，
 *     用于屏蔽 scale 快捷键）
 *  5. 注册右键菜单（菜单项注册表）
 *  6. 加载初始角色；订阅主进程推流的 'character:active-changed'，实现热切换
 *  7. 主循环 ticker 推进动画
 */

// PixiJS v8 在严格 CSP 下需要显式导入 unsafe-eval 旁路模块

import { EventBus } from './core/event-bus';
import { CharacterManager } from './core/character-manager';
import { ChatAdapter } from './core/chat-adapter';
import { TtsAdapter } from './core/tts-adapter';
import { SpeechBubble } from './core/speech-bubble';
import { setupDrag, type DragController } from './drag';
import { createDebugHud, isDevRenderer } from './core/debug-hud';
import {
  setupContextMenu,
  registerMenuItem,
  setMenuScale,
  setMenuTheme,
  type MenuItem,
} from './menu';

const STAGE_ID = 'pet-stage';

/** 缩放上下限（右键菜单 / 键盘控制） */
const SCALE_MIN = 0.2;
const SCALE_MAX = 1.5;
const SCALE_STEP = 0.1;
const SCALE_DEFAULT = 0.5;

/** 随机播放互动动画的间隔范围 */
const IDLE_MOTION_MIN_MS = 30_000;
const IDLE_MOTION_RANGE_MS = 60_000;

async function boot(): Promise<void> {
  // ---- 1) 取首个角色 config ----
  // 第一帧必须知道"激活角色是谁"。
  // 优先从 petApi.getActiveCharacter() 拿（多角色切换场景下与主进程保持一致）。
  const initialId = await window.petApi.getActiveCharacter();
  const initialCharacterId = initialId ?? 'roxy';

  const cfg = await window.petApi.loadCharacter(initialCharacterId);
  if (!cfg) {
    console.error('[renderer] failed to load character config', { initialCharacterId });
    return;
  }

  // ---- 2) URL 解析 ----
  const toAbsolute = (p: string): string =>
    new URL(p.split('/').map(encodeURIComponent).join('/'), document.baseURI).toString();

  // ---- 3) 舞台容器（DOM）----
  // 渲染层已从 PixiJS 8 改为原生 canvas（spine-canvas 4.0.x），
  // 与原版 V1.1 架构一致：舞台就是一个普通 div，角色往里塞 <canvas>。
  const stage = document.getElementById(STAGE_ID) as HTMLElement;
  const root = document.createElement('div');
  // root 是**角色的自然尺寸**容器（不是铺满窗口）：
  //   角色 canvas 按自然像素尺寸（如 584×1133）布局，
  //   再由 CharacterManager.applyScale 用 `transform: scale(s)` 缩到显示尺寸。
  // 若 root 铺满窗口（inset:0），canvas 会被窗口尺寸二次约束，角色只剩一角。
  root.style.cssText = 'position:absolute;left:0;top:0;transform-origin:top left;';
  stage.appendChild(root);
  console.log('[renderer] stage ready');

  // 拖拽 / 右键菜单挂在 stage 上（角色 canvas 自身 pointer-events:none）
  const canvas = stage;  // 拖拽 / 菜单挂在 stage 上

  // ---- 4) EventBus + 适配器 ----
  const bus = new EventBus();

  const chat = new ChatAdapter({
    bus,
    ask: (text) => window.petApi.chatAsk(text),
    onToken: (cb) => window.petApi.onChatToken(cb),
  });
  chat.start();

  const tts = new TtsAdapter({
    bus,
    speak: (text, voice) => window.petApi.ttsSpeak(text, voice),
    onState: (cb) => window.petApi.onTtsState(cb),
  });
  tts.start();

  const bubble = new SpeechBubble({
    bus,
    parent: document.getElementById(STAGE_ID) as HTMLElement,
    autoHideAfter: 4000,
  });
  bubble.start();

  // ---- 5) CharacterManager ----
  const onScaleChanged = (s: number): void => {
    setMenuScale(s);
  };

  // 拖拽标志先于 manager 声明：manager 要引用它做防御（避免拖拽期间任何 resizeWindow 穿透到主进程）
  let isDragging = false;

  const manager = new CharacterManager({
    bus,
    root,
    adapter: {
      loadCharacter: (id) => window.petApi.loadCharacter(id),
      resizeWindow: (size) => window.petApi.resizeWindow(size),
    },
    toAbsolute,
    onScaleChanged,
    initialScale: cfg.meta?.displayScale ?? SCALE_DEFAULT,
    isDragging: () => isDragging,
  });
  // 启动也走 switchTo：current==null 时自动跳过 fadeOut，避免启动黑屏；
  // 这样首次加载也有 fadeIn 渐显效果。
  await manager.switchTo(cfg);

  // ---- 6) 拖拽 + 菜单 ----
  const drag: DragController = setupDrag(canvas, {
    onTap: () => {
      manager.triggerTap();
    },
    onDragStateChanged: (dragging) => {
      isDragging = dragging;
      bus.emit('drag:state', { dragging });
    },
  });
  const ctxMenu = setupContextMenu(canvas);

  // ---- 开发期调试仪表盘（F9 开关）----
  //
  // 用途：把"拖拽时窗口是不是变大了 / 有没有跟手"变成**可读数字**，
  // 不用靠肉眼猜。外框/内容尺寸分开显示，一眼能分清是"真的变大"
  // 还是"位置漂移"；光标相对窗口原点的偏移（抓取值 vs 当前值）能看出跟手程度。
  if (isDevRenderer()) {
    const hud = createDebugHud();
    hud.setStatsSource(() => drag.stats);
  }

  // 角色切换菜单（submenu，会动态拉 listCharacters）
  // 注册占位；真正点击时再 fetch 后添加为 children。
  const characterSwitchItem: MenuItem = {
    id: 'switch-character',
    label: '切换角色',
    kind: 'submenu',
    children: [
      {
        id: 'switch-character:placeholder',
        label: '（加载中…）',
        onSelect: () => {
          /* placeholder */
        },
      },
    ],
  };
  registerMenuItem(characterSwitchItem);

  // 加载角色列表后回填菜单
  void (async (): Promise<void> => {
    const list = await window.petApi.listCharacters();
    if (list.length === 0) return;
    let activeId = await window.petApi.getActiveCharacter();

    /** 把"切换角色"子菜单的 ✓ 标记按当前 activeId 重画 */
    const refreshMenuMarks = (): void => {
      const rebuildLabels = (
        items: MenuItem[],
        prefix: string,
      ): MenuItem[] =>
        items.map((it) => {
          if (it.kind === 'submenu') return it;
          // 从 id "prefix:character-id" 中取出真正的 characterId
          const cid = it.id.startsWith(`${prefix}:`) ? it.id.slice(prefix.length + 1) : '';
          const cleanLabel = it.label.replace(/^✓\s*/, '');
          const nextLabel = cid && cid === activeId ? `✓ ${cleanLabel}` : cleanLabel;
          return { ...it, label: nextLabel } as MenuItem;
        });
      characterSwitchItem.children = rebuildLabels(characterSwitchItem.children, 'switch-character');
      ctxMenu.rerender();
    };

    /**
     * 推导出"激活角色对应的菜单主题名"。
     * baseId 决定主题：roxy → 浅蓝，ailisi → 浅红；其他角色（无 baseId）回退到 roxy。
     */
    const themeNameForActive = (cfgId: string): string => {
      const cfg = list.find((c) => c.id === cfgId);
      const base = cfg?.baseId ?? 'roxy';
      return base;
    };

    /** 应用主题（背景色等） */
    const applyTheme = (cfgId: string | null): void => {
      setMenuTheme(themeNameForActive(cfgId ?? 'roxy'));
    };

    // 通用切换：只列**日间**模型 —— 夜间版本由系统时间自动切换，不允许手动选
    characterSwitchItem.kind = 'submenu';
    const dayList = list.filter((c) => c.variant !== 'night');
    characterSwitchItem.children = dayList.map<MenuItem>((c) => ({
      id: `switch-character:${c.id}`,
      label: `${activeId === c.id ? '✓ ' : ''}${c.displayName}`,
      onSelect: async (): Promise<void> => {
        const ok = await window.petApi.setActiveCharacter(c.id);
        if (ok) activeId = c.id;
        applyTheme(activeId);
        refreshMenuMarks();
        // 主进程会推流回来，这里无需手动 load
      },
    }));
    ctxMenu.rerender();

    // 启动时按当前激活角色应用主题
    applyTheme(activeId);

    // 自动时间切换：主进程推送新 active 时刷新主题 + ✓ 标记
    window.petApi.onCharacterChanged((newCfg) => {
      activeId = newCfg.id;
      applyTheme(activeId);
      refreshMenuMarks();
    });
  })();

  // "常驻" 开关项
  const initialPinned = await window.petApi.getPinned();
  registerMenuItem({
    id: 'pin',
    label: '常驻',
    kind: 'toggle',
    checked: initialPinned,
    onSelect: async (next: boolean) => {
      await window.petApi.setPinned(next);
      ctxMenu.rerender();
    },
  });

  // "调整大小" 二级菜单
  registerMenuItem({
    id: 'resize',
    label: '调整大小',
    kind: 'submenu',
    children: [
      { id: 'shrink', label: '缩小 (-)', onSelect: () => applyScale(manager.scale - SCALE_STEP) },
      { id: 'enlarge', label: '放大 (+)', onSelect: () => applyScale(manager.scale + SCALE_STEP) },
      { id: 'reset-scale', label: '默认大小', onSelect: () => applyScale(SCALE_DEFAULT) },
    ],
  });

  registerMenuItem({
    id: 'reset-position',
    label: '恢复默认位置',
    onSelect: async () => {
      await window.petApi.resetWindowPosition();
    },
  });

  // ---- 7) 键盘缩放（拖拽期禁用） ----
  const applyScale = (target: number): void => {
    if (isDragging) return; // 拖拽中屏蔽 —— 修"长按拖拽窗口变大"
    void manager.applyScale(target);
  };
  window.addEventListener('keydown', (e) => {
    // 焦点在输入控件时不缩放（保留给气泡 / 后续 dialog 用）
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === 'INPUT') return;
    if (e.key === '+' || e.key === '=') applyScale(manager.scale + SCALE_STEP);
    else if (e.key === '-' || e.key === '_') applyScale(manager.scale - SCALE_STEP);
    else if (e.key === '0') applyScale(SCALE_DEFAULT);
  });

  // ---- 8) ticker（rAF 驱动）----
  let lastFrame = performance.now();
  const tickLoop = (): void => {
    const now = performance.now();
    const dtMs = now - lastFrame;
    lastFrame = now;
    if (manager.character) manager.character.tick(dtMs);
    requestAnimationFrame(tickLoop);
  };
  requestAnimationFrame(tickLoop);

  // ---- 9) 闲置随机互动 ----
  const scheduleRandomMotion = (): void => {
    window.setTimeout(
      () => {
        const ch = manager.character;
        if (ch && !ch.isMotionPlaying?.()) manager.triggerTap();
        scheduleRandomMotion();
      },
      IDLE_MOTION_MIN_MS + Math.random() * IDLE_MOTION_RANGE_MS,
    );
  };
  scheduleRandomMotion();

  // ---- 10) 订阅主进程推流的角色激活变更 ----
  window.petApi.onCharacterChanged((newCfg) => {
    void manager.switchTo(newCfg);
  });

  // ---- 11) 启动后对齐一次 ----
  await window.petApi.realignWindow();

  // 把一些对象挂到 window 方便 DevTools 调试
  (window as unknown as { __pet?: unknown }).__pet = { bus, manager, chat, tts };
}

boot().catch((err) => {
  console.error('[renderer] boot failed', err);
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
