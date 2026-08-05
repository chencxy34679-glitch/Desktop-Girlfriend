/**
 * TTS（语音合成）IPC handler 占位实现。
 *
 * 真实落地方案选项：
 *  - 云服务：Azure / 字节火山 / 微软 SAPI / Edge TTS（免费但有特征）
 *  - 本地：windows 内建 SAPI（无需联网，但音质一般）
 *
 * 当前未选型。先把 IPC 通道占下，渲染层 UI 已可以接。
 */

import { BrowserWindow, ipcMain, type IpcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc-channels';

export function registerTtsIpc(
  ipcMain_: typeof ipcMain | IpcMain,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain_.handle(
    IpcChannels.TtsSpeak,
    (_evt, payload: { text: string; voice?: string; rate?: number }) => {
      const win = getMainWindow();
      // eslint-disable-next-line no-console
      console.log('[tts] 占位 speak:', payload.text, payload.voice ?? '<default>');
      // 真实实现：发起合成 → 播放 / 写出 wav 给 renderer 播
      // 这里让 renderer 知道请求已受理
      if (win && !win.isDestroyed()) {
        win.webContents.send('tts:state', { speaking: true });
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('tts:state', { speaking: false });
          }
        }, Math.min(2000, Math.max(200, payload.text.length * 50)));
      }
      return true;
    },
  );
}
