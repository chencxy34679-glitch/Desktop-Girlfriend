/**
 * Vue 嵌入适配 —— 在 Vue / 任意 Web 容器里直接挂一个桌面宠物。
 *
 * 用法（Vue 组件内）：
 *   import { mountPet, type PetRuntime } from '@renderer/vue-adapter/mount-pet';
 *
 *   const runtime = ref<PetRuntime | null>(null);
 *   onMounted(async () => {
 *     runtime.value = await mountPet(rootEl.value!, {
 *       initialCharacterId: 'roxy',
 *       adapter: myAdapter,      // 自定义 PetApi 实现（fetch LLM / 自管 tts）
 *     });
 *   });
 *   onBeforeUnmount(() => runtime.value?.dispose());
 *
 * - PetApi 类型与 Electron preload 的 petApi 完全一致；
 * - toAbsolute 用 location.origin + container 自身的 baseURI 解析资源 URL；
 * - 拖拽等功能默认走 PointerEvent，鼠标 / 触控都可用。
 *
 * 如果宿主容器本身被设了 transform / overflow，拖拽方向可能反；
 * 推荐把容器定位为 fixed/absolute，pointer-events 全部接管。
 */

import { EventBus } from '../core/event-bus';
import { setupDrag } from '../drag';
import { CharacterManager } from '../core/character-manager';
import type { CharacterConfig } from '../../../shared/character-config';

export interface MountOptions {
  /** 初始角色 id（也可不传，等 setActiveCharacter 时再加载） */
  initialCharacterId?: string;
  /** 自定义的 PetApi：Vue 嵌入场景下需对接自有的 LLM / TTS / 状态接口 */
  adapter: VuePetApi;
  /** scale 变化时通知外部（Vue 容器尺寸联动等） */
  onScaleChanged?: (scale: number) => void;
}

export interface VuePetApi {
  loadCharacter(id: string): Promise<CharacterConfig | null>;
  listCharacters(): Promise<Array<{ id: string; displayName: string; type: 'spine' | 'live2d' }>>;
  resizeWindow(size: { width: number; height: number }): Promise<boolean>;
  setActiveCharacter?(id: string): Promise<boolean>;
  onCharacterChanged?(cb: (cfg: CharacterConfig) => void): () => void;
  /** 拖拽事件宿主决定如何处理（Vue 嵌入一般自行更新 CSS transform） */
  onDragMove?(delta: { dx: number; dy: number }): void;
  onDragState?(state: { dragging: boolean }): void;
  /** Chat 接口（可选） */
  chatAsk?(text: string): Promise<boolean>;
  onChatToken?(cb: (chunk: { text?: string; done: boolean }) => void): () => void;
  /** TTS 接口（可选） */
  ttsSpeak?(text: string, voice?: string): Promise<boolean>;
  onTtsState?(cb: (state: { speaking: boolean }) => void): () => void;
}

export interface PetRuntime {
  bus: EventBus;
  manager: CharacterManager;
  /** 替换为其他角色 */
  setActiveCharacter(id: string): Promise<boolean>;
  /** 释放资源 */
  dispose(): void;
}

/** container 的 baseURI 解析：URL 用 location.href 作为基准 */
function makeToAbsolute(): (p: string) => string {
  return (p: string): string =>
    new URL(p.split('/').map(encodeURIComponent).join('/'), document.baseURI || location.href).toString();
}

/**
 * 把宠物挂到一个 DOM 容器里，返回一个 runtime 调用句柄。
 *
 * 注意：PetRuntime 内的 charManager 不会自动 setActiveCharacter，
 * 所以如果传了 initialCharacterId 则立刻加载；否则要走外部 setActiveCharacter。
 */
export async function mountPet(container: HTMLElement, opts: MountOptions): Promise<PetRuntime> {
  // 给容器一个 stage
  let stage = container.querySelector<HTMLDivElement>('.pet-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.className = 'pet-stage';
    stage.style.cssText = `position:relative;width:100%;height:100%;`;
    container.appendChild(stage);
  }
  const toAbsolute = makeToAbsolute();

  // 渲染层用原生 canvas（spine-canvas 4.0.x），舞台是一个普通 div
  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0;transform-origin:top left;';
  stage.appendChild(root);
  const canvas = stage;

  // 应用容器样式：跟桌面宠物拖拽体验一致
  if (!stage.style.cursor) stage.style.cursor = 'grab';
  stage.classList.add('pet-running');

  const bus = new EventBus();

  const manager = new CharacterManager({
    bus,
    root,
    adapter: {
      loadCharacter: (id) => opts.adapter.loadCharacter(id),
      resizeWindow: (size) => opts.adapter.resizeWindow(size),
    },
    toAbsolute,
    onScaleChanged: (s) => opts.onScaleChanged?.(s),
    initialScale: 1.0,
  });

  // 监听 active 角色变更（来自 setActiveCharacter）
  const disposeChange = opts.adapter.onCharacterChanged
    ? opts.adapter.onCharacterChanged(async (cfg) => {
        await manager.switchTo(cfg);
      })
    : null;

  // 拖拽
  const drag = setupDrag(canvas, {
    onMove: (dx, dy) => opts.adapter.onDragMove?.({ dx, dy }),
    onTap: () => manager.triggerTap(),
    onDragStateChanged: (dragging) => opts.adapter.onDragState?.({ dragging }),
  });

  // 初始角色
  if (opts.initialCharacterId) {
    const cfg = await opts.adapter.loadCharacter(opts.initialCharacterId);
    if (cfg) {
      await manager.load(cfg);
    }
  }

  // 主循环（rAF 驱动）
  let lastFrame = performance.now();
  const tickLoop = (): void => {
    const now = performance.now();
    const dtMs = now - lastFrame;
    lastFrame = now;
    const ch = manager.character;
    if (ch) ch.tick(dtMs);
    requestAnimationFrame(tickLoop);
  };
  requestAnimationFrame(tickLoop);

  const runtime: PetRuntime = {
    bus,
    manager,
    async setActiveCharacter(id: string): Promise<boolean> {
      if (opts.adapter.setActiveCharacter) {
        return await opts.adapter.setActiveCharacter(id);
      }
      const cfg = await opts.adapter.loadCharacter(id);
      if (!cfg) return false;
      await manager.switchTo(cfg);
      return true;
    },
    dispose: (): void => {
      disposeChange?.();
      drag.dispose();
      manager.dispose();
      bus.clear();
      root.remove();
      canvas.remove();
    },
  };
  return runtime;
}

/** 便捷导出（Vue 模板中可写 `v-if="loading"`） */
export function isMounted(runtime: PetRuntime | null): runtime is PetRuntime {
  return runtime !== null;
}
