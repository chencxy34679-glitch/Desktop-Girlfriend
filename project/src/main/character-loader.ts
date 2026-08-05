/**
 * 角色加载器：从磁盘读 characters/<id>/config.json 并归一化成 CharacterConfig。
 *
 * 路径选择：
 *  - 开发：`project/assets/characters/<id>/config.json`
 *  - 打包：`process.resourcesPath/assets/characters/<id>/config.json`
 *    （electron-builder 的 extraResources 复制过去的）
 */

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { CharacterConfig, CharacterSummary, CharacterDriverType } from '../shared/character-config';

function baseDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '..', '..', 'assets');
}

function configPath(id: string): string {
  return path.join(baseDir(), 'characters', id, 'config.json');
}

function inferDriverType(cfg: Partial<CharacterConfig>): CharacterDriverType {
  if (cfg.type === 'spine' || cfg.type === 'live2d') return cfg.type;
  if (cfg.live2d?.modelUrl) return 'live2d';
  return 'spine';
}

/**
 * 读单个角色配置；找不到 / 解析失败返回 null（与旧 IPC 行为一致）。
 */
export function loadCharacterConfig(characterId: string): CharacterConfig | null {
  try {
    const raw = fs.readFileSync(configPath(characterId), 'utf-8');
    const cfg = JSON.parse(raw) as Partial<CharacterConfig>;
    if (!cfg.id || !cfg.displayName) return null;
    const type = inferDriverType(cfg);
    return {
      id: cfg.id,
      displayName: cfg.displayName,
      type,
      spine: cfg.spine,
      live2d: cfg.live2d,
      meta: cfg.meta ?? {},
    };
  } catch (err) {
    console.error('[main] character:load failed', characterId, err);
    return null;
  }
}

/**
 * 扫角色目录，返回每个合法 config 的概要。
 *
 * 容错：单个 config 解析失败就跳过，不影响整个列表。
 * baseId / variant 用于 renderer 侧做"时段切换"分组与排序。
 */
export function listCharacters(): CharacterSummary[] {
  const dir = path.join(baseDir(), 'characters');
  if (!fs.existsSync(dir)) return [];
  const out: CharacterSummary[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const cfg = loadCharacterConfig(entry.name);
    if (!cfg) continue;
    out.push({
      id: cfg.id,
      displayName: cfg.displayName,
      type: cfg.type ?? 'spine',
      baseId: cfg.meta?.baseId,
      variant: typeof cfg.meta?.variant === 'string' ? cfg.meta.variant : undefined,
    });
  }
  return out;
}
