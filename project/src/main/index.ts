/**
 * Electron 主进程入口
 *
 * 职责：
 *  1. 创建一张无边框、透明背景、可拖动的桌面宠物窗口
 *  2. 把窗口对齐到它所在 display 的工作区右下角（不再固定 primary，修了多显示器贴错屏）
 *  3. 注册 IPC handler（窗口状态、角色、TTS、Chat 预留通道）
 *  4. 检测其它前台应用是否全屏，若是则隐藏窗口
 *
 * Bug 修复相关改动（在 window-state.ts 里集中）：
 *  - 拖拽期间屏蔽 setSize 误触（防"长按拖拽时窗口不断变大"）
 *  - 拖拽期累计位移 < 阈值 → 视为长按微动，自动回到默认位置模式
 *  - 使用 `screen.getDisplayMatching(win.getBounds())` 选择显示器
 */

import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import { TaskbarTracker } from './taskbar-tracker';
import { FullscreenTracker } from './fullscreen-tracker';
import { WindowState } from './window-state';
import { AutoTimeScheduler } from './auto-time-scheduler';
import { IpcChannels } from '../shared/ipc-channels';
import { registerCharacterIpc } from './ipc/character';
import { registerChatIpc } from './ipc/chat';
import { registerTtsIpc } from './ipc/tts';
import {
  createPersonalWindow,
  getPersonalWindow,
} from './windows/personal-window';

// 关掉 Windows 原生遮挡计算：
// 透明无边框窗口在快速拖动时，DWM 重新计算窗口遮挡会触发整窗重绘，造成闪烁。
//
// 同时关掉 Win11 的 Snap Layout / Aero Snap —— 用户拖动窗口时 Windows 会主动
// 通过 SetWindowPos 调整窗口尺寸做"贴靠预览"，绕过 Electron 的 setSize。
app.commandLine.appendSwitch(
  'disable-features',
  'CalculateNativeWinOcclusion,SnapLayout,WindowSnap',
);

// 单实例：避免同时开多个
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let taskbarTracker: TaskbarTracker | null = null;
let fullscreenTracker: FullscreenTracker | null = null;
const winState = new WindowState();
const autoTimeScheduler = new AutoTimeScheduler({
  getMainWindow: () => mainWindow,
  log: (msg) => console.log(msg),
});

/** 当前是否处于"常驻"状态 */
let pinned = false;

/**
 * 创建主窗口。
 *
 * 注意：默认宽高给的非常"小"，因为 ready-to-show 之后 renderer 会按角色实际
 * imageSize 上调一次，这里只确保 BrowserWindow 能成功初始化。
 */
function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 320,
    height: 480,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    // ★ 关键：禁止 Win11 系统层面对窗口的"最大化 / 全屏 / Snap"操作
    // - maximizable: 关闭"拖到顶部自动最大化"和 Snap Layout 的预览
    // - fullscreenable: 关闭全屏按钮（虽然我们已经 frame:false，但保险）
    // 这两个 flag 让 Windows SetWindowPos 不能让窗口变"更大"
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  Menu.setApplicationMenu(null);

  // 按初始 pinned 状态同步 alwaysOnTop
  applyAlwaysOnTop(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  win.once('ready-to-show', () => {
    // 用窗口当前所在 display（多显示器贴齐更准）
    winState.alignToDefault(win);
    win.showInactive();
  });

  if (isDev) {
    win.webContents.on('console-message', (...args: unknown[]) => {
      const message = args[2];
      if (typeof message === 'string') console.log('[renderer]', message);
    });
    win.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        try {
          win.webContents.openDevTools({ mode: 'detach' });
        } catch {
          /* noop */
        }
      }, 200);
    });
  }

  return win;
}

function applyAlwaysOnTop(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (pinned) {
    win.setAlwaysOnTop(true, 'screen-saver');
    if (!win.isVisible()) win.showInactive();
  } else {
    win.setAlwaysOnTop(false);
  }
}

/**
 * 把窗口 resize 事件接到 WindowState —— 用户报告的关键问题。
 *
 * 现象：拖拽期间窗口长和宽会增大。
 * 根因：Win11 的 Snap Layout（多任务分屏）在用户拖动窗口时主动改尺寸，
 *       走的是 Win32 SetWindowPos，绕过 Electron 的 BrowserWindow.setSize
 *       —— 我们的 tryResize / IPC handler 拦不住。
 *
 * 修缮：监听 'resize' 事件；拖拽期间任何 resize（无论谁触发的）都强制
 *       调回 drag-start 时记录的 frozenSize。非拖拽期间 resize 是用户或
 *       程序主动改的，正常记录为下次拖拽的 frozenSize。
 */
function attachResizeGuard(win: BrowserWindow): void {
  win.on('resize', () => {
    winState.onExternalResize(win);
  });
}

/**
 * 注册所有 IPC handler。
 *
 * 拆分子目录（character / chat / tts / window）便于扩展；
 * 当前主要的事件常量集中在 src/shared/ipc-channels.ts。
 */
function registerIpcHandlers(): void {
  // ---- 通用只读 ----
  ipcMain.handle(IpcChannels.DisplayGetWorkArea, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return null;
    return winState.getWorkArea(win);
  });

  ipcMain.handle(IpcChannels.WindowGetPinned, () => pinned);

  // ---- 窗口状态 ----
  // resize：被 tryResize 防抖处理；拖拽期间**直接拒**返回 false，
  // 绝对不挂起、不 setSize。这是用户"拖拽时窗口大小不变"的绝对保障。
  ipcMain.handle(IpcChannels.WindowResize, (evt, payload: { width: number; height: number }) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    if (winState.isDragging) return false;
    return winState.tryResize(win, payload.width, payload.height);
  });

  // 拖拽开始 / 步进 / 结束：
  // - drag-start → 进入拖拽期，setSize 被锁住
  // - move-by  → 仅做位移，不去 setSize；用 dx/dy 累积判断是否"离开默认位置"
  // - drag-end → 累计位移 < 阈值则视作长按微动，重置 atDefaultPosition 并贴回右下
  ipcMain.handle(IpcChannels.WindowDragStart, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    winState.beginDrag(win);
    return true;
  });

  ipcMain.handle(
    IpcChannels.WindowMoveBy,
    (evt, payload: { dx: number; dy: number }) => {
      const win = BrowserWindow.fromWebContents(evt.sender);
      if (!win) return false;
      winState.moveByWhileDragging(win, payload.dx, payload.dy);
      return true;
    },
  );

  ipcMain.handle(IpcChannels.WindowDragEnd, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    winState.endDrag(win);
    return true;
  });

  ipcMain.handle(IpcChannels.WindowResetPosition, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    winState.resetToDefault(win);
    return true;
  });

  ipcMain.handle(IpcChannels.WindowRealign, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    taskbarTracker?.alignOnce();
    return true;
  });

  ipcMain.handle(IpcChannels.WindowSetPinned, (evt, next: boolean) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    pinned = !!next;
    applyAlwaysOnTop(win);
    return true;
  });

  ipcMain.handle(IpcChannels.WindowExit, () => {
    app.quit();
  });

  // ---- 个人界面 ----
  ipcMain.handle(IpcChannels.PersonalOpen, () => {
    createPersonalWindow();
    return true;
  });

  ipcMain.handle(IpcChannels.PersonalClose, () => {
    const win = getPersonalWindow();
    if (win && !win.isDestroyed()) win.close();
    return true;
  });

  // ---- 角色 / 聊天 / TTS ----
  registerCharacterIpc(ipcMain, () => mainWindow, autoTimeScheduler);
  registerChatIpc(ipcMain, () => mainWindow);
  registerTtsIpc(ipcMain, () => mainWindow);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createMainWindow();
  attachResizeGuard(mainWindow);

  taskbarTracker = new TaskbarTracker(mainWindow, winState);
  taskbarTracker.start();

  fullscreenTracker = new FullscreenTracker(mainWindow);
  fullscreenTracker.start();

  // 启动时段自动切换调度器；内部每 60s 巡检一次。
  // 真正的"激活角色认领"通过 ipc/character.ts 的 set-active / load 路径触发 onActiveChanged，
  // 这里只需要 start 即可。
  autoTimeScheduler.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.showInactive();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  taskbarTracker?.stop();
  fullscreenTracker?.stop();
  autoTimeScheduler.stop();
});
