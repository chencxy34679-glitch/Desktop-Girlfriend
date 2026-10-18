/**
 * Persona Store —— 当前激活角色的人格 / 形象 / 声音配置（占位骨架）。
 */
import { defineStore } from 'pinia';

interface PersonaState {
  characterId: string | null;
  variant: 'day' | 'night';
  voiceId: string | null;
  systemPrompt: string;
}

export const usePersonaStore = defineStore('persona', {
  state: (): PersonaState => ({
    characterId: 'roxy',
    variant: 'day',
    voiceId: null,
    systemPrompt: '',
  }),
  getters: {
    activeLabel: (s): string =>
      `${s.characterId ?? '未选'} · ${s.variant === 'day' ? '日间' : '夜间'}`,
  },
  actions: {
    selectCharacter(id: string): void {
      this.characterId = id;
    },
    setVariant(v: 'day' | 'night'): void {
      this.variant = v;
    },
  },
  persist: {
    key: 'dg.personal.persona',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
});