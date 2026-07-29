/**
 * Electron 主进程入口
 *
 * 职责：
 *  1. 创建一张无边框、透明背景、可拖动的桌面宠物窗口
 *  2. 把窗口放到当前 display 工作区右下角，悬浮在任务栏之上
 *  3. 监听 display 配置变化，重新对齐窗口
 *  4. 通过 IPC 把任务栏位置、角色配置等暴露给 renderer
 *  5. （MVP 后）检测其它前台应用是否全屏，若是则隐藏窗口
 */

import { app, BrowserWindow, screen, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { TaskbarTracker } from './taskbar-tracker';
import { FullscreenTracker } from './fullscreen-tracker';

// 关掉 Windows 原生遮挡计算：
// 透明无边框窗口在快速拖动时，DWM 重新计算窗口遮挡会触发整窗重绘，造成闪烁。
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// 单实例：避免同时开多个
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let taskbarTracker: TaskbarTracker | null = null;
let fullscreenTracker: FullscreenTracker | null = null;

// 当前加载的角色 id — 后续切换人物时改这里
const CURRENT_CHARACTER_ID = 'roxy';

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 568, // 默认宽，渲染层会按图片实际尺寸重排
    height: 998, // 默认高，按图片比例调整
    show: false, // 等 ready-to-show 再显示，避免白闪
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    // 关键：桌面宠物层级，比 normal 高，但不抢前台焦点
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // 需要 preload 引入 Node 模块
      // 允许透明像素正确合成
      backgroundThrottling: false,
    },
  });

  // 桌面宠物不需要菜单栏
  Menu.setApplicationMenu(null);

  // 不让窗口抢前台焦点（不要让它成为焦点窗口）
  // 通过 transparent 已经能达到部分效果，加 explicit `setFocusable(false)` 不太存在，
  // 这里使用点击通过 setAlwaysOnTop + showInactive
  win.setAlwaysOnTop(true, 'screen-saver');
  // 'screen-saver' 层级在 Windows 上位于大部分应用上方，但不抢前台

  // 拦截外链在系统浏览器打开
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
    alignWindowToTaskbar(win);
    win.showInactive();
  });

  // 开发模式下打开 DevTools（便于排查），
  // 用 detach 不抢前台焦点
  if (isDev) {
    // 把 renderer 的 console 转发到主进程终端，
    // 这样不必每次都开 DevTools 才能看到角色加载日志
    win.webContents.on('console-message', (...args: unknown[]) => {
      // Electron 33 签名为 (event, level, message, line, sourceId)
      const message = args[2];
      if (typeof message === 'string') console.log('[renderer]', message);
    });
    win.webContents.on('did-finish-load', () => {
      // 等一帧别和 ready-to-show 同时弹
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

/**
 * 把窗口对齐到当前 display 的右下角，工作区底边之上。
 * 渲染层接下来会按实际角色图尺寸重新调整 win 大小，
 * 这里只关心 (x, y)。
 */
function alignWindowToTaskbar(win: BrowserWindow): void {
  const display = screen.getPrimaryDisplay();
  const wa = display.workArea; // 不含任务栏
  const size = win.getSize();
  const x = wa.x + wa.width - size[0];
  const y = wa.y + wa.height - size[1];
  win.setPosition(x, y, false);
}

function registerIpcHandlers(): void {
  // 把任务栏位置（=工作区）告诉 renderer
  ipcMain.handle('display:get-work-area', () => {
    return screen.getPrimaryDisplay().workArea;
  });

  // 任务栏位置变更事件（display 切换、分辨率变化）
  ipcMain.handle('display:on-change', () => {
    // 单纯返回订阅入口，让 renderer 走 EventSource / IPC push
    return true;
  });

  // 加载角色配置（hot-resource hook）
  ipcMain.handle('character:load', (_evt, characterId: string) => {
    const configPath = path.join(
      __dirname,
      '..',
      '..',
      'assets',
      'characters',
      characterId,
      'config.json',
    );
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const cfg = JSON.parse(raw);
      // spine 里的路径相对 publicDir（项目根的 img/ 目录），不写前导斜杠，
      // 让 renderer 用 document.baseURI 解析：
      //   dev:  http://localhost:port/spine/roxy/roxy.atlas
      //   prod: file:///E:/.../out/renderer/spine/roxy/roxy.atlas
      return {
        id: cfg.id,
        displayName: cfg.displayName,
        spine: cfg.spine,
        meta: cfg.meta ?? {},
      };
    } catch (err) {
      console.error('[main] character:load failed', err);
      return null;
    }
  });

  // 通知主进程定位窗口（renderer 首次出图后调用一次）
  // 后续不再触发 —— 用户拖到哪算哪
  ipcMain.handle('window:realign', (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (win) taskbarTracker?.alignOnce();
    return true;
  });

  // 调整窗口尺寸 — 不再重新对齐位置，由用户当前拖到的位置为准
  ipcMain.handle('window:resize', (evt, payload: { width: number; height: number }) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    const w = Math.max(64, Math.floor(payload.width));
    const h = Math.max(64, Math.floor(payload.height));
    win.setMinimumSize(64, 64);
    win.setSize(w, h, false);
    // 注意：故意不调用 alignWindowToTaskbar，
    // 缩放后位置保持用户拖到的位置不变。
    return true;
  });

  // 把窗口按 delta 移动（拖拽用）
  ipcMain.handle('window:move-by', (evt, payload: { dx: number; dy: number }) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return false;
    const [x, y] = win.getPosition();
    win.setPosition(Math.round(x + payload.dx), Math.round(y + payload.dy), false);
    return true;
  });

  // 通知主进程退出
  ipcMain.handle('window:exit', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createMainWindow();

  taskbarTracker = new TaskbarTracker(mainWindow);
  taskbarTracker.start();

  fullscreenTracker = new FullscreenTracker(mainWindow);
  fullscreenTracker.start();

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
  // 桌面宠物退出时整个 app 退出
  app.quit();
});

app.on('before-quit', () => {
  taskbarTracker?.stop();
  fullscreenTracker?.stop();
});
