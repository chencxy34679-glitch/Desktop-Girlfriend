/**
 * Billing Store —— 会员等级 / 积分余额（占位骨架）。
 */
import { defineStore } from 'pinia';

export type MembershipTier = 'free' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

interface BillingState {
  tier: MembershipTier;
  tierExpiresAt: number | null;
  credits: number;
  /** 当前生效的付费套餐 ID（来自市场接口） */
  planId: string | null;
}

export const useBillingStore = defineStore('billing', {
  state: (): BillingState => ({
    tier: 'free',
    tierExpiresAt: null,
    credits: 0,
    planId: null,
  }),
  getters: {
    isMember: (s): boolean => s.tier !== 'free',
    creditsLabel: (s): string => `${s.credits} 💎`,
  },
  actions: {
    refresh(payload: Partial<BillingState>): void {
      Object.assign(this.$state, payload);
    },
    spend(credits: number): boolean {
      if (this.credits < credits) return false;
      this.credits -= credits;
      return true;
    },
  },
  persist: {
    key: 'dg.personal.billing',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
});