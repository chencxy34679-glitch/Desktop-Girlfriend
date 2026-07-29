/**
 * 让 renderer 端能拿到 window.petApi 的类型。
 */
import type { PetApi, CharacterConfig } from './index';

declare global {
  interface Window {
    petApi: PetApi;
  }
}

export type { CharacterConfig };
export {};
