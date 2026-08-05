/**
 * 极简单事件总线 —— Core 层。
 *
 * 设计目标：feature 模块之间解耦（chat / tts / 气泡 / 角色动画可以订阅）。
 *
 * 不依赖任何框架，迁移到 Vue / 普通 DOM / Worker 都成立。
 */

export type EventMap = {
  'character:loaded': { id: string; displayName: string };
  'character:disposed': { id: string };
  'character:tap': { id: string };
  'chat:reply': { text: string; done: boolean };
  'tts:state': { speaking: boolean };
  'drag:state': { dragging: boolean };
  'stage:scale': { scale: number };
  [k: string]: unknown;
};

export type EventName = keyof EventMap;
export type Listener<T = unknown> = (payload: T) => void;

export class EventBus {
  private readonly map: Map<string, Set<Listener>> = new Map();

  on<K extends EventName>(name: K, listener: Listener<EventMap[K]>): () => void {
    let set = this.map.get(name as string);
    if (!set) {
      set = new Set();
      this.map.set(name as string, set);
    }
    set.add(listener as Listener);
    return () => set!.delete(listener as Listener);
  }

  emit<K extends EventName>(name: K, payload: EventMap[K]): void {
    const set = this.map.get(name as string);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as Listener<EventMap[K]>)(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[event-bus] listener for ${String(name)} threw`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
