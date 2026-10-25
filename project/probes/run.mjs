/**
 * 探针运行器 —— 依次跑若干探针脚本。
 *
 * 用法：node probes/run.mjs probes/probe5-regression.js [更多...]
 *
 * ★ 为什么不能只用 cmd 的 `set ELECTRON_RUN_AS_NODE=&&` ★
 * VSCode / IDE 启动的终端里，这个环境变量**本来就被设成了 1**
 * （ELECTRON_RUN_AS_NODE=1 时 Electron 会以纯 Node 模式启动，拿不到 BrowserWindow）。
 * 在 npm 脚本里再套一层 cmd，引号解析会把 `set` 那半截吃掉，清不掉。
 * 所以这里直接在**子进程 env 里删掉**这个变量，最稳。
 *
 * electron 可执行文件路径由 `require('electron')` 直接给出（普通 Node 进程里
 * 该模块导出的是 exe 路径），不用依赖 PATH。
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronPath = require('electron');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法: node probes/run.mjs <probe.js...>');
  process.exit(1);
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

for (const f of files) {
  console.log(`▶ ${f}`);
  const r = spawnSync(electronPath, [f], { stdio: 'inherit', env });
  if (r.status !== 0) {
    console.error(`✗ ${f} 退出码 ${r.status}`);
    process.exit(r.status ?? 1);
  }
}
console.log('全部完成');
