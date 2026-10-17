/*
 * Web Speech API 验证脚本(M0 阶段一次性使用)
 *
 * 用途:启动一个 Electron BrowserWindow 加载 web-speech-test.html,
 *      用于验证当前 Electron 内核是否支持 SpeechRecognition API。
 *
 * 用法:
 *   cd project/
 *   npx electron scripts/test-web-speech.js
 *
 * 决策:
 *   - 如果 API 可用 → 在 Settings 面板用 Web Speech(零成本)
 *   - 如果 API 不可用 → 全部走主进程代理 Whisper API(/v1/stt/transcribe)
 *
 * 验证完后可删除该脚本 + web-speech-test.html(临时调试用)
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  console.log('[Web Speech 验证] 启动 Electron BrowserWindow...');
  console.log(`[Web Speech 验证] Electron 版本: ${process.versions.electron}`);
  console.log(`[Web Speech 验证] Chromium 版本: ${process.versions.chrome}`);
  console.log(`[Web Speech 验证] Node 版本: ${process.versions.node}`);

  const win = new BrowserWindow({
    width: 800,
    height: 720,
    title: 'Web Speech API 验证 — 桌面女友',
    webPreferences: {
      // 安全配置保持与主进程一致
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // 加载测试页
  const testPagePath = path.join(__dirname, '..', 'web-speech-test.html');
  win.loadFile(testPagePath);

  // 打开 DevTools,方便看 console
  win.webContents.openDevTools({ mode: 'detach' });

  // 拦截 renderer 中的 console,转回主进程 stdout
  win.webContents.on('console-message', (_event, level, message, line, source) => {
    const tag = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level] || 'LOG';
    console.log(`[Renderer ${tag}] ${message} (${source}:${line})`);
  });

  win.on('closed', () => {
    console.log('[Web Speech 验证] 窗口关闭,退出验证');
  });
});

app.on('window-all-closed', () => {
  app.quit();
});