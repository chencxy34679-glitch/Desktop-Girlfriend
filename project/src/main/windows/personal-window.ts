/**
 * PersonalWindow —— 个人界面独立 BrowserWindow。
 *
 * 关键点：
 *  - 单实例：已存在则 show + focus，不重复创建
 *  - dev 阶段从 http://localhost:5174/ 加载（personal entry 的 Vite dev server）
 *  - 生产阶段从 out/personal/index.html 加载
 *  - 关闭时清空引用，下次调用重新创建
 *  - preload 复用 src/preload/index.ts（与桌面宠物共用 petApi），并在个人
 *    preload 脚本里追加 personalApi
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

const isDev = !app.isPackaged;
let personalWindow: BrowserWindow | null = null;

/** dev server URL；端口与 electron.vite.config.ts 中 personal.server.port 对齐 */
const PERSONAL_DEV_URL = 'http://localhost:5174/';

/**
 * 创建（或聚焦已存在的）个人界面窗口。
 */
export function createPersonalWindow(): BrowserWindow {
  if (personalWindow && !personalWindow.isDestroyed()) {
    if (!personalWindow.isVisible()) personalWindow.showInactive();
    personalWindow.focus();
    return personalWindow;
  }

  personalWindow = new BrowserWindow({
    width: 880,
    height: 620,
    minWidth: 720,
    minHeight: 480,
    show: false,
    frame: true,
    transparent: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: false,
    hasShadow: true,
    backgroundColor: '#FBF3E4',
    title: '个人界面 · 洛琪希',
    webPreferences: {
      // 与桌面宠物窗口共用 src/preload/index.ts 的 contextBridge；
      // 个人界面额外的 personalApi 通过 src/personal/preload.ts 暴露
      // （在 personal entry 的 Vite 配置里以第二个 preload 形式注入，
      //  这里先保留单一 preload 入口；后续如需拆分 preload，再调整）
      preload: join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  if (isDev && process.env['ELECTRON_PERSONAL_URL']) {
    personalWindow.loadURL(process.env['ELECTRON_PERSONAL_URL']);
  } else if (isDev) {
    personalWindow.loadURL(PERSONAL_DEV_URL);
  } else {
    personalWindow.loadFile(join(__dirname, '..', 'personal', 'index.html'));
  }

  personalWindow.once('ready-to-show', () => {
    personalWindow?.showInactive();
  });

  if (isDev) {
    personalWindow.webContents.on('console-message', (...args: unknown[]) => {
      const message = args[2];
      if (typeof message === 'string') console.log('[personal]', message);
    });
  }

  personalWindow.on('closed', () => {
    personalWindow = null;
  });

  return personalWindow;
}

/** 获取当前窗口（供 IPC handler 调用方使用） */
export function getPersonalWindow(): BrowserWindow | null {
  return personalWindow && !personalWindow.isDestroyed() ? personalWindow : null;
}