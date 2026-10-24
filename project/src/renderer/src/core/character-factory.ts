/**
 * 角色工厂 —— M0 阶段只支持 Spine，Live2D 暂时禁用。
 *
 * 历史：之前支持 Live2D 类型（预留位），因版权剥离删除了 Live2D/ 资源目录，
 *      Live2DCharacter / Live2DEnabled 模块也被一并剥离（它们只在抽象层有意义，
 *      没有实际角色资源）。此处把 Live2D 分支注释，factory 仅返回 SpineCharacter，
 *      后续 M5+ 如重新引入 Live2D，直接取消注释并补回 live2d-character.ts。
 *
 *  - 路径统一在 CharacterConfig 里，URL 由调用方传进来（document.baseURI 解析）。
 *  - factory 不缓存资源（资源是 OS 缓存 / Spine atlas load 缓存，多份实例不会真正增加）。
 */

import type { CharacterConfig } from '../../../shared/character-config';
import type { ICharacter } from './i-character';
import { SpineCharacter, type SpineCharacterOptions } from './spine-character';

// import { Live2DCharacter, type Live2DCharacterOptions, Live2DEnabled } from './live2d-character';

export interface ResourceUrls {
  atlasUrl: string;
  jsonUrl: string;
  /**
   * Live2D 模型 URL。当前 factory 不再创建 Live2DCharacter，
   * 保留字段以保持上层调用方代码不变，M5+ 真正引入 Live2D 时再启用。
   */
  live2dModelUrl: string;
}

export interface CreateCharacterInput {
  config: CharacterConfig;
  urls: ResourceUrls;
}

/**
 * URL 解析工具：
 *  - spine.atlasUrl / spine.jsonUrl 相对文档 baseURI
 *  - live2d.modelUrl 同上（当前未用，保留兼容）
 */
export function resolveCharacterUrls(
  config: CharacterConfig,
  toAbsolute: (p: string) => string,
): ResourceUrls {
  const spine = config.spine;
  const live2d = config.live2d;
  return {
    atlasUrl: spine ? toAbsolute(spine.atlasUrl) : '',
    jsonUrl: spine ? toAbsolute(spine.jsonUrl) : '',
    live2dModelUrl: live2d ? toAbsolute(live2d.modelUrl) : '',
  };
}

export async function createCharacter(input: CreateCharacterInput): Promise<ICharacter> {
  const { config, urls } = input;

  // M0 阶段：Live2D 暂不可用，任何 type==='live2d' 的角色配置都走降级路径。
  // 后续若安装 pixi-live2d-display 并提供资源，放开下面注释即可。
  if (config.type === 'live2d') {
    throw new Error(
      `Live2D 角色 "${config.id}" 暂未启用。请在 core/live2d-character.ts 中安装 ` +
        'pixi-live2d-display 并补回角色资源后启用。',
    );
  }

  // 默认走 Spine 分支
  if (!config.spine) {
    throw new Error(`Character "${config.id}" missing spine config`);
  }
  const opts: SpineCharacterOptions = {
    id: config.id,
    displayName: config.displayName,
    atlasUrl: urls.atlasUrl,
    jsonUrl: urls.jsonUrl,
    idleAnim: config.spine.idleAnim ?? 'idle',
    motionAnim: config.spine.motionAnim ?? 'motion',
  };
  return await SpineCharacter.create(opts);
}
