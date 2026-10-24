/**
 * 主进程 / 渲染进程之间共用的 IPC 通道名常量。
 *
 * 把 channel 名集中在这一处，避免散落在 main / preload 两端的字符串漂移。
 * 重命名 / 增加 channel 时也只需改这里。
 */

export const IpcChannels = {
  /** 读取主 display 工作区 */
  DisplayGetWorkArea: 'display:get-work-area',
  /** 订阅 display 变化（仅占位：返回 true，让 renderer 走轮询或 EventSource） */
  DisplayOnChange: 'display:on-change',

  /** 加载单个角色配置（按 id） */
  CharacterLoad: 'character:load',
  /** 列出全部可用角色 */
  CharacterList: 'character:list',
  /** 当前激活角色 */
  CharacterGetActive: 'character:get-active',
  /** 切换激活角色 */
  CharacterSetActive: 'character:set-active',

  /** 通知主进程：renderer 已出图，让窗口重新对齐 */
  WindowRealign: 'window:realign',
  /** 调整窗口尺寸（仅在非拖拽期生效，防拖拽期间 resize 误触） */
  WindowResize: 'window:resize',
  /** 通知主进程按位移移动窗口；同时上报是否进入/退出拖拽 */
  WindowMoveBy: 'window:move-by',
  WindowDragStart: 'window:drag-start',
  WindowDragEnd: 'window:drag-end',
  /** 把窗口恢复到默认位置（右下角/工作区底线） */
  WindowResetPosition: 'window:reset-position',
  /** 切换常驻状态 */
  WindowSetPinned: 'window:set-pinned',
  WindowGetPinned: 'window:get-pinned',
  /** 退出应用 */
  WindowExit: 'window:exit',

  /** 预留：chat 输入 / 回复，主进程代理 LLM API 调用（密钥不暴露给 renderer） */
  ChatAsk: 'chat:ask',
  /** 主进程推流：chat 回复片段（避免 renderer 阻塞等待 LLM 流式输出） */
  ChatToken: 'chat:token',
  /** 预留：TTS 合成（主进程调用云端 / 本地 TTS） */
  TtsSpeak: 'tts:speak',

  /** 🆕 个人界面窗口 —— 打开 / 关闭 / ping */
  PersonalOpen: 'personal:open',
  PersonalClose: 'personal:close',

  /** 🆕 鉴权模块 —— 匿名注册（拿匿名身份，首次启动自动调用） */
  AuthAnonymous: 'auth:anonymous',
  /** 🆕 鉴权模块 —— 匿名升级为正式用户（需要带匿名 access token） */
  AuthRegister: 'auth:register',
  /** 🆕 鉴权模块 —— 用户名密码登录 */
  AuthLogin: 'auth:login',
  /** 🆕 鉴权模块 —— 用 refresh token 续期 */
  AuthRefresh: 'auth:refresh',
  /** 🆕 鉴权模块 —— 读取设备 / 运行环境信息与当前后端地址 */
  AuthGetProfile: 'auth:profile',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];