<script setup lang="ts">
/**
 * Billing 视图 —— 会员状态、积分余额、套餐购买、支付二维码（占位，M1 接入）。
 */
import { useBillingStore } from '../stores/billing';

const _billing = useBillingStore();
</script>

<template>
  <section class="p-6">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">💎 会员与积分</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 会员徽标 + 到期时间 -->
      <div class="box-pixel p-4">
        <h2 class="font-pixel text-sm mb-3 text-retro-text">会员状态</h2>
        <div class="placeholder-block h-24 flex items-center justify-center">
          <span class="font-pixel text-xs text-retro-text-muted">[ 💎 会员徽标占位 ]</span>
        </div>
      </div>

      <!-- 积分余额 -->
      <div class="box-pixel p-4">
        <h2 class="font-pixel text-sm mb-3 text-retro-text">积分余额</h2>
        <div class="placeholder-block h-24 flex items-center justify-center">
          <span class="font-pixel text-xs text-retro-text-muted">[ 积分卡片占位 ]</span>
        </div>
      </div>

      <!-- 套餐选择 -->
      <div class="box-pixel p-4 md:col-span-2">
        <h2 class="font-pixel text-sm mb-3 text-retro-text">套餐选择</h2>
        <div class="placeholder-block h-32 flex items-center justify-center">
          <span class="font-pixel text-xs text-retro-text-muted">[ 月卡 / 季卡 / 年卡 占位 ]</span>
        </div>
      </div>

      <!-- 支付二维码 -->
      <div class="box-pixel p-4 md:col-span-2">
        <h2 class="font-pixel text-sm mb-3 text-retro-text">支付二维码</h2>
        <div class="placeholder-block h-40 flex items-center justify-center">
          <span class="font-pixel text-xs text-retro-text-muted">[ 微信 / 支付宝 二维码占位 ]</span>
        </div>
      </div>
    </div>
  </section>
</template>