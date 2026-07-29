/**
 * 自定义右键菜单（MVP 仅退出，后续加切换人物等功能）
 *
 * 用 DOM 实现：定位便捷，样式可控。
 * 不让 Electron 默认的 application menu 弹出来 —— 主进程已经 setApplicationMenu(null)。
 *
 * 后续：菜单项会通过配置 / feature 模块动态注册成一个数组，
 * 这里留一个 registry 占位，符合"插件化"的需求。
 */

interface MenuItem {
  id: string;
  label: string;
  enabled?: boolean;
  onSelect?: () => void | Promise<void>;
}

// 简单注册表（feature 模块可往里 push）
const registry: MenuItem[] = [];

export function registerMenuItem(item: MenuItem): void {
  registry.push(item);
}

export function setupContextMenu(canvas: HTMLCanvasElement): { dispose: () => void } {
  // DOM 菜单节点
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed;
    z-index: 9999;
    min-width: 120px;
    padding: 4px 0;
    background: rgba(32, 28, 38, 0.92);
    color: #fff;
    font-size: 12px;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.35);
    backdrop-filter: blur(8px);
    display: none;
    user-select: none;
  `;
  // 给菜单内层加点击逻辑
  const renderItems = (): void => {
    menu.innerHTML = '';
    if (registry.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:8px 14px;color:#999;';
      empty.textContent = '（无可用功能）';
      menu.appendChild(empty);
      return;
    }
    for (const item of registry) {
      const node = document.createElement('div');
      node.style.cssText = `
        padding: 6px 14px;
        cursor: ${item.enabled === false ? 'not-allowed' : 'pointer'};
        opacity: ${item.enabled === false ? '0.45' : '1'};
      `;
      node.textContent = item.label;
      node.addEventListener('mouseenter', () => {
        if (item.enabled !== false) node.style.background = 'rgba(255,255,255,0.08)';
      });
      node.addEventListener('mouseleave', () => {
        node.style.background = '';
      });
      node.addEventListener('click', async () => {
        hide();
        if (item.enabled !== false && item.onSelect) {
          await item.onSelect();
        }
      });
      menu.appendChild(node);
    }
  };

  const show = (x: number, y: number): void => {
    renderItems();
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
  };
  const hide = (): void => {
    menu.style.display = 'none';
  };

  document.body.appendChild(menu);

  const onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    show(e.clientX, e.clientY);
  };
  const onClick = (): void => hide();
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') hide();
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
    },
  };
}
