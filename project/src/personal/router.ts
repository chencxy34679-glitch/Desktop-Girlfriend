/**
 * 个人界面路由 —— hash 模式（Electron 加载本地文件用 file:// 协议，
 * 没有 server 端路由兜底，必须 hash 才能跳转子页面）。
 *
 * 所有 view 当前都是占位，正式业务在 M1 阶段接入。
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

import Account from './views/Account.vue';
import Login from './views/Login.vue';
import Billing from './views/Billing.vue';
import Character from './views/Character.vue';
import Chat from './views/Chat.vue';
import Settings from './views/Settings.vue';
import Market from './views/Market.vue';
import AgentManager from './views/AgentManager.vue';
import RagManager from './views/RagManager.vue';
import About from './views/About.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/account' },
  { path: '/account', name: 'account', component: Account, meta: { title: '账号', icon: '👤' } },
  { path: '/login', name: 'login', component: Login, meta: { title: '登录', icon: '🔐' } },
  { path: '/billing', name: 'billing', component: Billing, meta: { title: '会员与积分', icon: '💎' } },
  { path: '/character', name: 'character', component: Character, meta: { title: '角色', icon: '🌸' } },
  { path: '/chat', name: 'chat', component: Chat, meta: { title: '聊天', icon: '💬' } },
  { path: '/settings', name: 'settings', component: Settings, meta: { title: '设置', icon: '⚙️' } },
  { path: '/market', name: 'market', component: Market, meta: { title: '市场', icon: '🛒' } },
  { path: '/agents', name: 'agents', component: AgentManager, meta: { title: 'Agent 管理', icon: '🤖' } },
  { path: '/rags', name: 'rags', component: RagManager, meta: { title: 'RAG 管理', icon: '📚' } },
  { path: '/about', name: 'about', component: About, meta: { title: '关于', icon: 'ℹ️' } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});