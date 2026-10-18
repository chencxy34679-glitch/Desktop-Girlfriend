/**
 * SpineCharacter —— 基于 Spine 骨骼动画的角色实现。
 *
 * 资源是 Spine 4.1.x 导出的三件套（.atlas + .json + .png）。
 * 运行时用 4.2 runtime（已做 4.1→4.2 patch）。
 *
 * 模型自带两个动画：
 *  - idle：循环待机，含眨眼 + 头发飘动
 *  - motion：单次互动（点击 / 随机定时触发）
 *
 * 这是 Core 层代码：不依赖 Electron，可被 Vue 嵌入场景复用。
 */

import { Assets, Container } from 'pixi.js';
import {
  Spine,
  SkeletonJson,
  AtlasAttachmentLoader,
  SkinsAndAnimationBoundsProvider,
  type TextureAtlas,
} from '@esotericsoftware/spine-pixi-v8';
import type { ICharacter } from './i-character';

export interface SpineCharacterOptions {
  /** 资源 URL（与文档 baseURI 拼装后形成可加载的 URL） */
  atlasUrl: string;
  jsonUrl: string;
  idleAnim?: string;
  motionAnim?: string;
  /** 角色 id / displayName，便于上抛到 EventBus / 头部 UI */
  id: string;
  displayName: string;
}

/** motion 播完淡回 idle 的过渡时长（秒） */
const MIX_DURATION = 0.2;
/** 计算包围盒时的采样步长 */
const BOUNDS_TIME_STEP = 1 / 30;

export class SpineCharacter implements ICharacter {
  readonly container = new Container();
  readonly imageSize: { width: number; height: number };
  readonly info: { id: string; displayName: string };

  private readonly spine: Spine;
  private readonly idleAnim: string;
  private readonly motionAnim: string;

  private constructor(
    spine: Spine,
    idleAnim: string,
    motionAnim: string,
    info: { id: string; displayName: string },
  ) {
    this.spine = spine;
    this.idleAnim = idleAnim;
    this.motionAnim = motionAnim;
    this.info = info;

    // Spine 的包围盒原点不在 (0,0)（root 骨骼通常在脚底），
    // 反向平移把 AABB 的左上角对齐到容器原点，让整个角色落在 [0,0,w,h] 内。
    const b = spine.getBounds();
    spine.x = -b.x;
    spine.y = -b.y;
    this.imageSize = { width: Math.ceil(b.width), height: Math.ceil(b.height) };

    this.container.addChild(spine);
  }

  static async create(opts: SpineCharacterOptions): Promise<SpineCharacter> {
    const idleAnim = opts.idleAnim ?? 'idle';
    const motionAnim = opts.motionAnim ?? 'motion';

    const [atlas, jsonText] = await Promise.all([
      Assets.load<TextureAtlas>(opts.atlasUrl),
      fetch(opts.jsonUrl).then((r) => {
        if (!r.ok) throw new Error(`加载骨骼数据失败 ${r.status}: ${opts.jsonUrl}`);
        return r.text();
      }),
    ]);

    const json = JSON.parse(jsonText) as { bones?: Array<Record<string, unknown>> };

    // Spine 4.1 → 4.2 的破坏性改动：bone.transform 字段重命名为 bone.inherit。
    for (const bone of json.bones ?? []) {
      if (bone.transform !== undefined) {
        bone.inherit = bone.transform;
        delete bone.transform;
      }
    }

    const skeletonData = new SkeletonJson(new AtlasAttachmentLoader(atlas)).readSkeletonData(json);

    const spine = new Spine({
      skeletonData,
      // 关掉自动更新，由 renderer 的 ticker 统一驱动
      autoUpdate: false,
      boundsProvider: new SkinsAndAnimationBoundsProvider(idleAnim, [], BOUNDS_TIME_STEP),
    });

    spine.state.data.defaultMix = MIX_DURATION;
    spine.state.setAnimation(0, idleAnim, true);

    return new SpineCharacter(spine, idleAnim, motionAnim, {
      id: opts.id,
      displayName: opts.displayName,
    });
  }

  tick(dtMs: number): void {
    this.spine.update(dtMs / 1000);
  }

  isMotionPlaying(): boolean {
    // Spine API 在不同版本间有变化,getCurrent 可能不存在或被重命名
    // 使用 try/catch + 类型断言兼容不同版本
    let current: any;
    try {
      // @ts-ignore - Spine API 兼容性
      current = (this.spine.state as any).getCurrent?.(0) ?? (this.spine.state as any).getCurrent?.();
    } catch {
      current = null;
    }
    return !!current && (current.animation?.name ?? current.trackIndex?.animation?.name) === this.motionAnim && !current.isComplete();
  }

  triggerTap(): boolean {
    if (this.isMotionPlaying()) return false;
    this.spine.state.setAnimation(0, this.motionAnim, false);
    this.spine.state.addAnimation(0, this.idleAnim, true, 0);
    return true;
  }

  dispose(): void {
    this.spine.destroy();
  }
}
