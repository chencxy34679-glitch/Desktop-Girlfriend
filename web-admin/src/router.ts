import { createRouter, createWebHashHistory } from 'vue-router';

/**
 * 后台管理路由表(hash 模式,便于静态部署)。
 *
 * 9 个一级入口,详见 PIXEL_UI_DESIGN.md C 章节设计规范:
 *   1. /dashboard        — 仪表盘
 *   2. /characters        — 角色管理
 *   3. /characters/audit  — 角色审核工作流
 *   4. /users             — 用户管理
 *   5. /orders            — 订单管理
 *   6. /moderation        — 资质审核
 *   7. /moderation/license — license 审核
 *   8. /stats             — 数据统计
 *   9. /settings          — 系统设置
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/',
      component: () => import('./layouts/AdminLayout.vue'),
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('./views/Dashboard.vue'),
          meta: { title: '仪表盘', icon: 'pixel:dashboard' },
        },
        {
          path: 'characters',
          name: 'characters',
          component: () => import('./views/Characters.vue'),
          meta: { title: '角色管理', icon: 'pixel:character' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('./views/Users.vue'),
          meta: { title: '用户管理', icon: 'pixel:users' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('./views/Orders.vue'),
          meta: { title: '订单管理', icon: 'pixel:orders' },
        },
        {
          path: 'moderation',
          name: 'moderation',
          component: () => import('./views/Moderation.vue'),
          meta: { title: '资质审核', icon: 'pixel:moderation' },
        },
        {
          path: 'stats',
          name: 'stats',
          component: () => import('./views/Stats.vue'),
          meta: { title: '数据统计', icon: 'pixel:stats' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
});

// 全局标题同步
router.afterEach((to) => {
  const title = (to.meta?.title as string) || '';
  document.title = title
    ? `${title} · Desktop Girlfriend 后台`
    : 'Desktop Girlfriend 后台';
});