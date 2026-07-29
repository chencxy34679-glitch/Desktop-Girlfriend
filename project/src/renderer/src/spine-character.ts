/**
 * SpineCharacter —— 基于 Spine 骨骼动画的角色实现。
 *
 * 素材是 Spine 4.1.24 导出的三件套（.atlas + .json + .png），
 * 运行时用 4.2 runtime 解析（已验证兼容，仅需 patch 一个字段）。
 *
 * 模型自带两个动画：
 *  - idle（4.0s，循环）：含眨眼 + 头发飘动，所以不再需要外挂的眨眼蒙版和发丝粒子
 *  - motion（2.0s，单次）：触摸反应，点击或随机定时触发
 */

import { Assets, Container } from 'pixi.js';
import {
  Spine,
  SkeletonJson,
  AtlasAttachmentLoader,
  SkinsAndAnimationBoundsProvider,
  type TextureAtlas,
} from '@esotericsoftware/spine-pixi-v8';
import type { ICharacter } from './character';

export interface SpineCharacterOptions {
  /** .atlas 文件 URL，同目录下的 .png 由官方 loader 自动解析加载 */
  atlasUrl: string;
  /** .json 骨骼数据 URL */
  jsonUrl: string;
  /** 循环待机动画名，默认 idle */
  idleAnim?: string;
  /** 单次互动动画名，默认 motion */
  motionAnim?: string;
}

/** motion 播完淡回 idle 的过渡时长（秒） */
const MIX_DURATION = 0.2;
/** 计算包围盒时的采样步长（秒）——越小越精确但越慢 */
const BOUNDS_TIME_STEP = 1 / 30;

export class SpineCharacter implements ICharacter {
  readonly container = new Container();
  readonly imageSize: { width: number; height: number };

  private readonly spine: Spine;
  private readonly idleAnim: string;
  private readonly motionAnim: string;

  private constructor(spine: Spine, idleAnim: string, motionAnim: string) {
    this.spine = spine;
    this.idleAnim = idleAnim;
    this.motionAnim = motionAnim;

    // Spine 的包围盒原点不在 (0,0)（root 骨骼通常在脚底），
    // 反向平移把 AABB 的左上角对齐到容器原点，让整个角色落在 [0,0,w,h] 内。
    // 注意 spine-pixi-v8 内部设置了 Skeleton.yDown = true，
    // 骨骼世界坐标已经和 Pixi 一样是 Y 向下，不需要任何翻转。
    const b = spine.getBounds();
    spine.x = -b.x;
    spine.y = -b.y;
    this.imageSize = { width: Math.ceil(b.width), height: Math.ceil(b.height) };

    this.container.addChild(spine);
  }

  static async create(opts: SpineCharacterOptions): Promise<SpineCharacter> {
    const idleAnim = opts.idleAnim ?? 'idle';
    const motionAnim = opts.motionAnim ?? 'motion';

    // atlas 交给官方 loader：它会按 atlas 所在目录解析 png 文件名，
    // 并根据 atlas 里的 pma:true 自动设置 alphaMode 为预乘 alpha。
    // json 则必须自己 fetch —— 因为要在解析前 patch 字段（见下）。
    const [atlas, jsonText] = await Promise.all([
      Assets.load<TextureAtlas>(opts.atlasUrl),
      fetch(opts.jsonUrl).then((r) => {
        if (!r.ok) throw new Error(`加载骨骼数据失败 ${r.status}: ${opts.jsonUrl}`);
        return r.text();
      }),
    ]);

    const json = JSON.parse(jsonText) as { bones?: Array<Record<string, unknown>> };

    // Spine 4.1 → 4.2 的唯一破坏性改动：bone.transform 字段被重命名为 bone.inherit。
    // 本模型有 3 根头发骨骼用了 noRotationOrReflection，不转换的话会退化成
    // 默认继承，头发会跟着父骨一起旋转。
    for (const bone of json.bones ?? []) {
      if (bone.transform !== undefined) {
        bone.inherit = bone.transform;
        delete bone.transform;
      }
    }

    const skeletonData = new SkeletonJson(new AtlasAttachmentLoader(atlas)).readSkeletonData(json);

    const spine = new Spine({
      skeletonData,
      // 关掉自动更新，改由 renderer 的 app.ticker 统一驱动，保证节奏一致
      autoUpdate: false,
      // 在 idle 全时长上采样求最大包围盒，
      // 避免只按某一帧算尺寸、导致动画摆到极限位置时被窗口裁掉
      boundsProvider: new SkinsAndAnimationBoundsProvider(idleAnim, [], BOUNDS_TIME_STEP),
    });

    spine.state.data.defaultMix = MIX_DURATION;
    spine.state.setAnimation(0, idleAnim, true);

    return new SpineCharacter(spine, idleAnim, motionAnim);
  }

  tick(dtMs: number): void {
    // spine-core 的时间单位是秒
    this.spine.update(dtMs / 1000);
  }

  /** motion 是否正在播放（用于避免连点和随机定时器重复触发） */
  isMotionPlaying(): boolean {
    const current = this.spine.state.getCurrent(0);
    return !!current && current.animation?.name === this.motionAnim && !current.isComplete();
  }

  /**
   * 触发一次互动动画：播完自动排队回 idle 循环。
   * @returns 是否真的触发了（正在播 motion 时返回 false）
   */
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
