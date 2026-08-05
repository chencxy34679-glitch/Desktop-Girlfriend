/**
 * Chat（AI 对话）IPC handler 占位实现。
 *
 * 真实落地时应当：
 *  - 主进程持有 LLM API 密钥（绝不下发 renderer）
 *  - 用流式响应把 token 增量推给 renderer（chat:token）
 *  - 跨 session 缓存对话历史（electron-store 或者主进程的文件缓存）
 *
 * 当前实现：
 *  - chat:ask 接收消息，回复一段固定内容
 *  - 用 chunk 推送模拟流式
 *  - 暴露 channle / 类型，便于 renderer 直接对接真实实现（替换这部分就行）
 */

import { BrowserWindow, ipcMain, type IpcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc-channels';

export function registerChatIpc(
  ipcMain_: typeof ipcMain | IpcMain,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain_.handle(
    IpcChannels.ChatAsk,
    (_evt, payload: { text: string; characterId?: string }) => {
      const win = getMainWindow();
      if (!win || win.isDestroyed()) return false;
      // 占位回复：按字符 split 推到 renderer，模拟流式响应。
      // 真实实现：发起 LLM SSE，把每个 token 转发到 chat:token
      const reply = `（占位）你刚才说："${payload.text}"。接入 LLM 后这里会改成流式回复。`;
      const chunkSize = 8;
      let i = 0;
      const send = (): void => {
        if (win.isDestroyed()) return;
        if (i >= reply.length) {
          win.webContents.send(IpcChannels.ChatToken, { done: true });
          return;
        }
        win.webContents.send(IpcChannels.ChatToken, {
          text: reply.slice(i, i + chunkSize),
          done: false,
        });
        i += chunkSize;
        setTimeout(send, 40);
      };
      send();
      return true;
    },
  );
}
