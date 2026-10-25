/*
 * 开发模式启动器 —— 同时拉起两个 dev server + Electron 主进程。
 *
 * 为什么需要这个脚本：
 *   electron-vite 在 dev 模式下只为 renderer 启一个 dev server(5173)，
 *   额外的 personal entry 只会参与 build，不会起自己的 dev server。
 *   所以个人界面(5174)需要单独跑 `vite --config vite.personal.config.mjs`。
 *
 * 启动顺序：
 *   1. vite --config vite.personal.config.mjs   → 个人界面 dev server (5174)
 *   2. electron-vite dev                        → 宠物 renderer (5173) + Electron 窗口
 *
 * 零新依赖：只用 Node 内置 child_process。
 *
 * 用法：npm run dev
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

/** Windows 下用 cmd /c 才能正确处理 ELECTRON_RUN_AS_NODE 之类的环境变量前缀 */
const isWindows = process.platform === 'win32';

/**
 * 启动一个子进程。
 * @param {string} label 日志前缀
 * @param {string} cmd    可执行文件
 * @param {string[]} args 参数
 * @param {object} env   附加环境变量
 */
function run(label, cmd, args, env = {}) {
  const child = isWindows
    ? spawn('cmd', ['/c', cmd, ...args], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, ...env },
      })
    : spawn(cmd, args, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, ...env },
      });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev] ${label} 退出,code=${code}`);
    }
  });

  return child;
}

console.log('[dev] 启动个人界面 dev server (5174) ...');
const personal = run('personal', 'npx', ['vite', '--config', 'vite.personal.config.mjs']);

// Electron 若在 ELECTRON_RUN_AS_NODE=1 环境下启动，会退化成纯 Node 进程，
// electron.app 为 undefined，主进程直接崩（electron.app.isPackaged 报错）。
//
// 坑：run() 内部是 `{ ...process.env, ...env }`，如果只在 env 里 delete 这个键，
// 展开 process.env 时它又会回来。必须显式设为 undefined ——
// Node 的 spawn 会忽略值为 undefined 的环境变量，等价于"删除"。
const electronEnv = { ...process.env, ELECTRON_RUN_AS_NODE: undefined };

// 等个人界面 server 起来再拉 Electron，避免窗口白屏
setTimeout(() => {
  console.log('[dev] 启动 Electron 主进程 ...');
  run('electron', 'npx', ['electron-vite', 'dev'], electronEnv);
}, 2500);

/** 收到 Ctrl+C 时一并收掉所有子进程 */
function shutdown() {
  console.log('\n[dev] 正在关闭 ...');
  personal.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
