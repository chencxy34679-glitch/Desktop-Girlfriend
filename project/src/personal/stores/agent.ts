/**
 * Agent Store —— 可被角色调用的工具列表（占位骨架）。
 */
import { defineStore } from 'pinia';

export type AgentToolKind = 'builtin' | 'mcp' | 'script' | 'http';

export interface AgentTool {
  id: string;
  name: string;
  kind: AgentToolKind;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface AgentState {
  tools: AgentTool[];
}

export const useAgentStore = defineStore('agent', {
  state: (): AgentState => ({
    tools: [],
  }),
  getters: {
    enabledTools: (s): AgentTool[] => s.tools.filter((t) => t.enabled),
  },
  actions: {
    setTools(tools: AgentTool[]): void {
      this.tools = tools;
    },
    toggle(id: string, enabled: boolean): void {
      const t = this.tools.find((x) => x.id === id);
      if (t) t.enabled = enabled;
    },
  },
  persist: {
    key: 'dg.personal.agent',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
});