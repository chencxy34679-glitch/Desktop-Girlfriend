/**
 * 自定义右键菜单
 *
 * 结构：
 *  - 一级菜单项可以是：
 *    - 普通项（点击触发 onSelect）
 *    - 子菜单项（label + 子项列表，hover 自动展开）
 *    - 开关项（带 ✓ 标记的勾选状态，点击切换并触发 onSelect(next)）
 *  - 二级菜单在 hover 一级菜单项时自动展开，点击二级项后整个菜单收起
 *
 * 缩放策略（关键）：
 *  - 菜单的 font-size / padding / min-width / max-width 全部用 var(--pet-menu-scale, 1) 等比缩放
 *  - 这样窗口缩放到 0.3x 时菜单视觉上也只有 0.3x，不会"一大块"挡在窗口里
 *  - scale 通过 setMenuScale(s) 在外部（main.ts 的 applyScale 里）设置
 *
 * 定位策略：
 *  - 一级菜单位置：右键 clientX/clientY 处；同时夹紧到窗口客户区内
 *  - 二级菜单位置：默认在 owner 项右侧，但当右侧空间不够时往左展开，
 *    避免在窗口右下角被窗口边界裁掉 / 被其他应用覆盖。
 *
 * 配色（按产品要求）：淡天浅蓝色背景 + 深色文字。
 *
 * 后续：菜单项会通过配置 / feature 模块动态注册成一个数组，
 * 这里留一个 registry 占位，符合"插件化"的需求。
 */

interface BaseMenuItem {
  id: string;
  label: string;
  enabled?: boolean;
}

interface ActionMenuItem extends BaseMenuItem {
  kind?: 'action';
  onSelect: () => void | Promise<void>;
}

interface SubMenuItem extends BaseMenuItem {
  kind: 'submenu';
  children: Array<ActionMenuItem | SubMenuItem | ToggleMenuItem>;
  /** 子菜单默认 onSelect 可以为空（仅 hover 展开） */
  onSelect?: never;
}

/**
 * 开关项：显示 ✓ 与否，label 渲染为 "✓ label" / "label"
 * 点击触发 onSelect(next) —— next 是切换后的状态。
 */
interface ToggleMenuItem extends BaseMenuItem {
  kind: 'toggle';
  checked: boolean;
  onSelect: (next: boolean) => void | Promise<void>;
}

export type MenuItem = ActionMenuItem | SubMenuItem | ToggleMenuItem;

// 简单注册表（feature 模块可往里 push）
const registry: MenuItem[] = [];

export function registerMenuItem(item: MenuItem): void {
  registry.push(item);
}

/**
 * 当前菜单缩放因子。供 setMenuScale() 修改。
 *
 * 暴露此变量方便外部在创建 setupContextMenu 之前/之后都能拿到当前值
 * （例如 main.ts 里同步应用到 IPC 时读）。
 */
let menuScale = 1;

/**
 * 设置菜单缩放因子，等比缩放菜单的字号 / 内边距 / 宽度。
 *
 * 设置后会立即应用到所有已存在的菜单节点（之后创建的会自动继承 CSS 变量）。
 *
 * 调用方一般在 applyScale 里同步调用。
 */
export function setMenuScale(s: number): void {
  const v = Math.max(0.5, Math.min(2, s));
  menuScale = v;
  document.documentElement.style.setProperty('--pet-menu-scale', String(v));
}

/** 获取当前菜单缩放因子 */
export function getMenuScale(): number {
  return menuScale;
}

/** 主题调色板 —— 菜单背景随当前激活角色的 baseId 切换。
 *  每套主题都给出"清淡 + 半透明 + 同量级对比"的观感，
 *  与早期单色（浅天蓝）保持同样的可读性 / 层次结构。
 */
interface MenuTheme {
  bg: string;
  bgDark: string;
  border: string;
  hoverBg: string;
  text: string;
  textMuted: string;
  shadow: string;
}

/** 洛琪希主题 —— 淡天浅蓝（沿用初始默认色） */
const THEME_ROXY: MenuTheme = {
  bg: 'rgba(204, 232, 255, 0.78)',
  bgDark: 'rgba(184, 220, 250, 0.92)', // 子菜单稍深一点做层次
  border: 'rgba(140, 190, 220, 0.85)',
  hoverBg: 'rgba(170, 215, 248, 0.95)',
  text: '#1a3a52',
  textMuted: '#5a7892',
  shadow: 'rgba(80, 120, 160, 0.25)',
};

/** 艾莉丝主题 —— 浅红色（淡粉到淡红的过渡） */
const THEME_AILISI: MenuTheme = {
  bg: 'rgba(255, 196, 200, 0.82)',
  bgDark: 'rgba(244, 168, 176, 0.94)',
  border: 'rgba(220, 130, 140, 0.85)',
  hoverBg: 'rgba(248, 178, 188, 0.96)',
  text: '#5a1f24',
  textMuted: '#9c5a62',
  shadow: 'rgba(160, 80, 90, 0.28)',
};

const THEME_MAP: Record<string, MenuTheme> = {
  roxy: THEME_ROXY,
  ailisi: THEME_AILISI,
};

/** 当前主题；setMenuTheme() 修改。所有已存在的菜单节点会即时刷新。 */
let currentTheme: MenuTheme = THEME_ROXY;
/** 当前主题的 baseId 名称（仅日志用） */
let currentThemeName = 'roxy';

/** 取当前主题（方便外部调试 / 测试） */
export function getMenuTheme(): string {
  return currentThemeName;
}

/**
 * 切换菜单主题。会更新所有当前已挂载的菜单 DOM 节点（一级 + 二级）的颜色，
 * 之后新建的菜单也会用新主题。
 *
 * 允许传入未注册的主题名；此时退回到 roxy 默认主题，避免样式缺失导致菜单难读。
 */
export function setMenuTheme(name: string): void {
  const t = THEME_MAP[name] ?? THEME_ROXY;
  currentTheme = t;
  currentThemeName = THEME_MAP[name] ? name : 'roxy';
  // 找到所有 .pet-context-menu 节点并重写颜色
  for (const node of document.querySelectorAll<HTMLElement>('.pet-context-menu')) {
    applyTheme(node, node === menuRef ? currentTheme.bg : currentTheme.bgDark);
  }
}

/** 把当前主题套到指定菜单节点（一级用 bg，二级用 bgDark） */
function applyTheme(node: HTMLElement, bg: string): void {
  node.style.background = bg;
  node.style.borderColor = currentTheme.border;
  node.style.color = currentTheme.text;
  node.style.boxShadow = `0 6px 18px ${currentTheme.shadow}`;
  // 找下一级 hover 高亮（由 buildItemNode 单独持有引用，这里靠 inline style 覆盖）
}

/** 当前一级菜单节点的引用（setMenuTheme 用来区分一级/二级背景） */
let menuRef: HTMLDivElement | null = null;

/** 把菜单位置夹紧到视口（窗口客户区）内 */
function clampToViewport(
  desiredLeft: number,
  desiredTop: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // 至少留 4px 边距，不贴死边缘
  const PAD = 4;
  const left = Math.min(Math.max(PAD, desiredLeft), Math.max(PAD, vw - width - PAD));
  const top = Math.min(Math.max(PAD, desiredTop), Math.max(PAD, vh - height - PAD));
  return { left, top };
}

/**
 * 计算子菜单位置 + 箭头方向：
 *  - 默认往右展开；
 *  - 如果 owner 右侧剩余空间放不下子菜单，就往左展开。
 *  - 同时把整体位置夹紧到视口内。
 */
function positionSubmenu(
  ownerRect: DOMRect,
  subW: number,
  subH: number,
): { left: number; top: number; arrow: 'right' | 'left' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const PAD = 4;

  const rightFits = ownerRect.right - 2 + subW + PAD <= vw;
  const leftFits = ownerRect.left + 2 - subW - PAD >= 0;
  let desiredLeft: number;
  let arrow: 'right' | 'left';
  if (rightFits || (!rightFits && !leftFits)) {
    desiredLeft = ownerRect.right - 2;
    arrow = 'right';
  } else {
    desiredLeft = ownerRect.left + 2 - subW;
    arrow = 'left';
  }

  const desiredTop = ownerRect.top;
  const pos = clampToViewport(desiredLeft, desiredTop, subW, subH);
  return { left: pos.left, top: pos.top, arrow };
}

/**
 * 把菜单基础 CSS 用 `--pet-menu-scale` 变量按比例缩放。
 *
 * scale=1（默认）时给一个"看着舒服"的基准尺寸（比最小可工作尺寸大 25%）：
 *  - min-width 175px、font-size 13px、item padding 7px 18px
 *  - 几何/字号基准值都按 1.25 倍放大，方便默认状态下阅读和点击
 *
 * 之后 applyScale 把窗口缩到 < 1 时，菜单按比例缩小（变小但形状不变）。
 *
 * 公式：实际值 = calc(基准值 * var(--pet-menu-scale, 1))
 * 用 calc() + CSS 变量 而不是 JS 拼字符串，
 * 是因为这样 offsetWidth/offsetHeight 也会跟着 scale 走，
 * 后续 clampToViewport 的尺寸判断也是缩放后的真实视觉尺寸。
 */
function menuBaseCss(): string {
  return `
    position: fixed;
    z-index: 9999;
    min-width: calc(175px * var(--pet-menu-scale, 1));
    padding: calc(5px * var(--pet-menu-scale, 1)) 0;
    background: ${currentTheme.bg};
    color: ${currentTheme.text};
    font-size: calc(13px * var(--pet-menu-scale, 1));
    border: 1px solid ${currentTheme.border};
    border-radius: calc(8px * var(--pet-menu-scale, 1));
    box-shadow: 0 6px 18px ${currentTheme.shadow};
    backdrop-filter: blur(8px);
    display: none;
    user-select: none;
    line-height: 1.4;
  `;
}

function menuItemCss(enabled: boolean | undefined): string {
  return `
    padding: calc(7px * var(--pet-menu-scale, 1)) calc(18px * var(--pet-menu-scale, 1));
    cursor: ${enabled === false ? 'not-allowed' : 'pointer'};
    opacity: ${enabled === false ? '0.45' : '1'};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(14px * var(--pet-menu-scale, 1));
    white-space: nowrap;
  `;
}

export function setupContextMenu(canvas: HTMLCanvasElement): {
  dispose: () => void;
  /** 强制重新渲染菜单（用于外部状态变化后刷新勾选标记） */
  rerender: () => void;
} {
  // 初始化 CSS 变量默认值
  document.documentElement.style.setProperty('--pet-menu-scale', String(menuScale));

  // 一级菜单 DOM
  const menu = document.createElement('div');
  menu.className = 'pet-context-menu';
  menu.style.cssText = menuBaseCss();
  menuRef = menu;

  /** 当前显示中的二级菜单实例（同时最多一个） */
  let openSubmenu: { node: HTMLDivElement; owner: HTMLElement } | null = null;
  const closeSubmenu = (): void => {
    if (openSubmenu) {
      openSubmenu.node.remove();
      openSubmenu.owner.style.background = '';
      openSubmenu = null;
    }
  };

  /** 构造一个菜单项 DOM（递归用） */
  const buildItemNode = (
    item: MenuItem,
    depth: 0 | 1,
    closeAll: () => void,
  ): HTMLElement => {
    const node = document.createElement('div');
    node.style.cssText = menuItemCss(item.enabled);

    // 左侧 label 区域（含勾选标记）
    const labelEl = document.createElement('span');
    labelEl.style.cssText = 'flex:1;display:flex;align-items:center;gap:8px;';
    const mark = document.createElement('span');
    mark.style.cssText = `width:calc(15px * var(--pet-menu-scale, 1));flex-shrink:0;display:inline-block;text-align:center;`;
    const updateLabel = (): void => {
      if (item.kind === 'toggle') {
        mark.textContent = item.checked ? '✓' : '';
        if (!mark.parentNode) labelEl.appendChild(mark);
      } else if (mark.parentNode) {
        mark.remove();
      }
      // 去掉旧 label 文本（保留 mark）
      while (labelEl.lastChild && labelEl.lastChild !== mark) {
        labelEl.removeChild(labelEl.lastChild);
      }
      const text = document.createElement('span');
      text.textContent = item.label;
      labelEl.appendChild(text);
    };
    updateLabel();
    node.appendChild(labelEl);

    if (item.kind === 'submenu') {
      // 右侧加一个箭头提示（按子菜单展开方向调 ▶/◀）
      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.style.cssText = `font-size: calc(10px * var(--pet-menu-scale, 1)); opacity: 0.6; flex-shrink: 0;`;
      arrow.classList.add('pet-submenu-arrow');
      node.appendChild(arrow);

      const openThisSubmenu = (): void => {
        if (openSubmenu?.owner === node) return;
        closeSubmenu();
        const sub = document.createElement('div');
        sub.className = 'pet-context-menu';
        // 子菜单共享 menuBaseCss 的几何/字号/配色，
        // 但 display:none 必须覆盖成 block —— 一级菜单用 display:none
        // 是为了默认隐藏，子菜单相反，要可见（visibility:hidden 仅用于
        // 测尺寸阶段，定位完成后再 visible）。
        sub.style.cssText = `
          ${menuBaseCss()}
          z-index: 10000;
          background: ${currentTheme.bgDark};
          display: block;
          visibility: hidden;
        `;
        if (item.children.length === 0) {
          const empty = document.createElement('div');
          empty.style.cssText = `padding:calc(8px * var(--pet-menu-scale, 1)) calc(14px * var(--pet-menu-scale, 1));color:${currentTheme.textMuted};`;
          empty.textContent = '（无可用功能）';
          sub.appendChild(empty);
        } else {
          for (const child of item.children) {
            sub.appendChild(buildItemNode(child, 1, closeAll));
          }
        }
        document.body.appendChild(sub);
        const ownerRect = node.getBoundingClientRect();
        const w = sub.offsetWidth;
        const h = sub.offsetHeight;
        const pos = positionSubmenu(ownerRect, w, h);
        sub.style.left = `${pos.left}px`;
        sub.style.top = `${pos.top}px`;
        sub.style.visibility = 'visible';
        arrow.textContent = pos.arrow === 'right' ? '▶' : '◀';
        node.style.background = currentTheme.hoverBg;
        openSubmenu = { node: sub, owner: node };
      };

      node.addEventListener('mouseenter', openThisSubmenu);
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        openThisSubmenu();
      });
      return node;
    }

    // 普通 action / toggle 节点
    node.addEventListener('mouseenter', () => {
      if (item.enabled !== false) node.style.background = currentTheme.hoverBg;
      // 进入非 submenu 项时收起二级菜单
      if (depth === 0) closeSubmenu();
    });
    node.addEventListener('mouseleave', () => {
      if (item.enabled !== false) node.style.background = '';
    });
    node.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAll();
      if (item.enabled === false) return;
      if (item.kind === 'toggle') {
        const next = !item.checked;
        item.checked = next; // 立刻更新 registry 中的状态（让 rerender 拿到）
        await item.onSelect(next);
      } else if (item.kind === 'action' || item.kind === undefined) {
        await item.onSelect();
      }
    });
    return node;
  };

  const renderItems = (): void => {
    menu.innerHTML = '';
    if (registry.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `padding:calc(8px * var(--pet-menu-scale, 1)) calc(14px * var(--pet-menu-scale, 1));color:${currentTheme.textMuted};`;
      empty.textContent = '（无可用功能）';
      menu.appendChild(empty);
      return;
    }
    for (const item of registry) {
      menu.appendChild(buildItemNode(item, 0, closeAll));
    }
  };

  const closeAll = (): void => {
    closeSubmenu();
    hide();
  };

  const show = (x: number, y: number): void => {
    renderItems();
    // 先放到屏幕外测尺寸，避免闪一下再跳位置
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    menu.style.display = 'block';
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const pos = clampToViewport(x, y, w, h);
    menu.style.left = `${pos.left}px`;
    menu.style.top = `${pos.top}px`;
    menu.style.visibility = 'visible';
  };
  const hide = (): void => {
    menu.style.display = 'none';
    closeSubmenu();
  };

  document.body.appendChild(menu);

  const onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    show(e.clientX, e.clientY);
  };
  const onClick = (): void => closeAll();
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') closeAll();
  };

  canvas.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);

  // 注册默认项：退出
  registerMenuItem({
    id: 'exit',
    label: '退出',
    onSelect: async () => {
      await window.petApi.exitApp();
    },
  });

  return {
    dispose: () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      menu.remove();
      if (menuRef === menu) menuRef = null;
    },
    rerender: () => {
      // 菜单正在显示时，registry 项的 checked 改了 → 重画整个菜单
      if (menu.style.display !== 'none') {
        renderItems();
      }
    },
  };
}