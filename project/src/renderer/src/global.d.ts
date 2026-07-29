/**
 * 在 renderer 全局声明 window.petApi
 *
 * 让 drag.ts / main.ts / menu.ts 不必再单独 import 类型。
 */
import type { PetApi, CharacterConfig } from '../../preload/index';

declare global {
  interface Window {
    petApi: PetApi;
  }
}

export type { CharacterConfig };
export {};
