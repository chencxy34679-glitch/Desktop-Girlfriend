/**
 * 角色工厂 —— 按 type 选择 Spine / Live2D 实现。
 *
 * 设计：
 *  - 路径统一在 CharacterConfig 里，URL 由调用方传进来（document.baseURI 解析）。
 *  - factory 不缓存资源（资源是 OS 缓存 / Spine atlas load 缓存，多份实例不会真正增加）。
 *  - Live2D 未启用时 factory 直接抛错；上层 character-manager 会回退到默认角色。
 */

import type { CharacterConfig } from '../../../shared/character-config';
import type { ICharacter } from './i-character';
import { SpineCharacter, type SpineCharacterOptions } from './spine-character';
import { Live2DCharacter, type Live2DCharacterOptions, Live2DEnabled } from './live2d-character';

export interface ResourceUrls {
  atlasUrl: string;
  jsonUrl: string;
  live2dModelUrl: string;
}

export interface CreateCharacterInput {
  config: CharacterConfig;
  urls: ResourceUrls;
}

/**
 * URL 解析工具：
 *  - spine.atlasUrl / spine.jsonUrl 相对文档 baseURI
 *  - live2d.modelUrl 同上
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
  const type = config.type ?? (config.spine ? 'spine' : 'live2d');
  if (type === 'live2d') {
    if (!Live2DEnabled) {
      throw new Error(
        `Live2D requested by "${config.id}" but pixi-live2d-display not enabled. ` +
          'See core/live2d-character.ts for install steps.',
      );
    }
    if (!config.live2d) {
      throw new Error(`Live2D config "${config.id}" missing live2d.modelUrl`);
    }
    const opts: Live2DCharacterOptions = {
      id: config.id,
      displayName: config.displayName,
      modelUrl: urls.live2dModelUrl,
      idleMotionGroup: config.live2d.idleMotionGroup,
      motionGroup: config.live2d.motionGroup,
      defaultExpressions: config.live2d.defaultExpressions,
    };
    return await Live2DCharacter.create(opts);
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
