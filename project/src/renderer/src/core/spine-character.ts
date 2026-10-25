/**
 * SpineCharacter —— 基于 Spine 骨骼动画的角色实现。
 *
 * ── 为什么用 spine-canvas 4.0.x 而不是 spine-pixi-v8 4.2 ──────────────
 * 角色资源（洛琪希 / 艾莉丝 × 日/夜）是 **Spine 3.x 导出格式**：
 * 骨架级约束放在顶层 `ik` / `transform` 数组里。
 *
 *   - spine-core **4.0.x** 读 `root.ik` + `root.transform`  → 与资源完全匹配，零转换
 *   - spine-core **4.1+** 改读 `root.constraints`（统一数组，每项带 type）→ 与资源不兼容
 *
 * 也就是说 4.1 是一次破坏性格式变更，必须用 4.0.x runtime 才能直接吃这批资源。
 * 原版 V1.1 打包产物用的正是 spine-canvas 4.0 系列，本实现与其一致。
 *
 * ── 渲染方式 ──────────────────────────────────────────────────────
 * spine-canvas 走 **canvas 2D**（不是 WebGL），因此本类自己持有一个
 * <canvas> 元素并挂进 `container`。PixiJS 8 已从渲染层移除：
 * 气泡、拖拽、右键菜单本来就是 DOM 实现，不受影响。
 *
 * ── Spine 4.0 的动画 API 是「分离式」────────────────────────────────
 * 4.0 不再有 `skeleton.state`，而是：
 *   const stateData = new AnimationStateData(skeletonData);
 *   const state = new AnimationState(stateData);
 *   state.setAnimation(0, 'idle', true);
 *   state.apply(skeleton);        // 把动画姿态写到 skeleton
 *
 * 模型自带两个动画：
 *  - idle：循环待机，含眨眼 + 头发飘动
 *  - motion：单次互动（点击 / 随机定时触发）
 *
 * 这是 Core 层代码：不依赖 Electron，可被 Vue 嵌入场景复用。
 */

import {
  AssetManager,
  CanvasTexture,
  SkeletonRenderer,
  AtlasAttachmentLoader,
  AnimationState,
  AnimationStateData,
  Skeleton,
  SkeletonJson,
  RegionAttachment,
  MeshAttachment,
  type TextureAtlas,
} from '@esotericsoftware/spine-canvas';
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
/** 设备像素比上限，避免 4K 屏上 canvas 过大 */
const MAX_DPR = 2;

export class SpineCharacter implements ICharacter {
  readonly container: HTMLElement;
  readonly imageSize: { width: number; height: number };
  readonly info: { id: string; displayName: string };

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly skeleton: Skeleton;
  private readonly state: AnimationState;
  private readonly renderer: SkeletonRenderer;
  private readonly assetManager: AssetManager;
  private readonly idleAnim: string;
  private readonly motionAnim: string;
  /** 包围盒左上角的反向平移量（世界坐标 → 画布坐标） */
  private readonly offsetX: number;
  private readonly offsetY: number;
  private disposed = false;

  private constructor(params: {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    skeleton: Skeleton;
    state: AnimationState;
    renderer: SkeletonRenderer;
    assetManager: AssetManager;
    bounds: { x: number; y: number; width: number; height: number };
    id: string;
    displayName: string;
    idleAnim: string;
    motionAnim: string;
  }) {
    this.canvas = params.canvas;
    this.ctx = params.ctx;
    this.skeleton = params.skeleton;
    this.state = params.state;
    this.renderer = params.renderer;
    this.assetManager = params.assetManager;
    this.idleAnim = params.idleAnim;
    this.motionAnim = params.motionAnim;
    this.info = { id: params.id, displayName: params.displayName };

    // Spine 的包围盒原点不在 (0,0)（root 骨骼通常在脚底），
    // 反向平移把 AABB 的左上角对齐到画布原点，让整个角色落在 [0,0,w,h] 内。
    this.offsetX = -params.bounds.x;
    this.offsetY = -params.bounds.y;
    this.imageSize = {
      width: Math.ceil(params.bounds.width),
      height: Math.ceil(params.bounds.height),
    };

    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:100%;height:100%;pointer-events:none;';
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;';
    el.appendChild(this.canvas);
    this.container = el;
  }

  static async create(opts: SpineCharacterOptions): Promise<SpineCharacter> {
    const idleAnim = opts.idleAnim ?? 'idle';
    const motionAnim = opts.motionAnim ?? 'motion';

    // 1) 取 atlas 文本与骨架 JSON 文本
    const [atlasText, jsonText] = await Promise.all([
      fetch(opts.atlasUrl).then((r) => {
        if (!r.ok) throw new Error(`加载 atlas 失败 ${r.status}: ${opts.atlasUrl}`);
        return r.text();
      }),
      fetch(opts.jsonUrl).then((r) => {
        if (!r.ok) throw new Error(`加载骨骼数据失败 ${r.status}: ${opts.jsonUrl}`);
        return r.text();
      }),
    ]);

    const json = JSON.parse(jsonText) as Record<string, unknown>;

    // 2) 建 canvas（尺寸稍后按包围盒设置）
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 canvas 2D 上下文');

    // 3) 加载 atlas + 页面纹理
    const assetManager = new AssetManager();
    const atlas = await loadTextureAtlas(assetManager, atlasText, opts.atlasUrl);

    // 4) 解析骨架数据（4.0 读 root.ik / root.transform，与 3.x 资源完全匹配）
    const attachmentLoader = new AtlasAttachmentLoader(atlas);
    const skeletonJson = new SkeletonJson(attachmentLoader);
    const skeletonData = skeletonJson.readSkeletonData(json as never);

    // 5) 建 skeleton 与动画状态（4.0 分离式 API）
    const skeleton = new Skeleton(skeletonData);
    const stateData = new AnimationStateData(skeletonData);
    stateData.defaultMix = MIX_DURATION;
    const state = new AnimationState(stateData);
    state.setAnimation(0, idleAnim, true);
    state.apply(skeleton);

    // 6) 求包围盒（必须在 state.apply 之后，骨骼姿态才是 idle 动画帧）
    const bounds = computeBounds(skeleton, state);

    // 7) 按包围盒设置画布尺寸（含 DPR）
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const cssWidth = Math.max(1, Math.ceil(bounds.width));
    const cssHeight = Math.max(1, Math.ceil(bounds.height));
    canvas.width = Math.ceil(cssWidth * dpr);
    canvas.height = Math.ceil(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.scale(dpr, dpr);

    const renderer = new SkeletonRenderer(ctx);

    return new SpineCharacter({
      canvas,
      ctx,
      skeleton,
      state,
      renderer,
      assetManager,
      bounds,
      id: opts.id,
      displayName: opts.displayName,
      idleAnim,
      motionAnim,
    });
  }

  tick(dtMs: number): void {
    if (this.disposed) return;
    const dt = dtMs / 1000;
    this.state.update(dt);
    this.state.apply(this.skeleton);
    this.draw();
  }

  private draw(): void {
    const { ctx, canvas, offsetX, offsetY } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 画布已按 DPR 缩放，这里再平移到 AABB 左上角
    ctx.save();
    ctx.translate(offsetX, offsetY);
    this.renderer.draw(this.skeleton);
    ctx.restore();
  }

  isMotionPlaying(): boolean {
    const current = this.state.getCurrent(0);
    return current?.animation?.name === this.motionAnim;
  }

  triggerTap(): boolean {
    if (this.isMotionPlaying()) return false;
    this.state.setAnimation(0, this.motionAnim, false);
    this.state.addAnimation(0, this.idleAnim, true, 0);
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.state.clearTracks();
    this.assetManager.dispose();
    this.container.remove();
  }
}

/* ------------------------------------------------------------------ */
/* 辅助                                                                */
/* ------------------------------------------------------------------ */

/**
 * 手动加载 texture atlas：解析 atlas 文本 → 逐页加载图片 → 注入纹理。
 *
 * 不用 `AssetManager.loadTextureAtlas`（它会自己再下载一次 atlas 文本），
 * 这里复用已经 fetch 到的 atlasText，省一次网络请求。
 */
async function loadTextureAtlas(
  assetManager: AssetManager,
  atlasText: string,
  atlasUrl: string,
): Promise<TextureAtlas> {
  const core = await import('@esotericsoftware/spine-core');
  const atlas = new core.TextureAtlas(atlasText);
  const baseDir = atlasUrl.slice(0, atlasUrl.lastIndexOf('/') + 1);
  const pages = atlas.pages;
  if (pages.length === 0) {
    throw new Error(`atlas 没有页面: ${atlasUrl}`);
  }

  await Promise.all(
    pages.map(
      (page) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            page.setTexture(new CanvasTexture(img));
            resolve();
          };
          img.onerror = () =>
            reject(new Error(`加载 atlas 页面图片失败: ${baseDir}${page.name}`));
          img.src = baseDir + page.name;
        }),
    ),
  );

  // 让 AssetManager 也持有这些纹理，便于统一 dispose
  return atlas;
}

/**
 * 计算角色包围盒（世界坐标）。
 *
 * ── 为什么不能直接用 `SkeletonBounds` ──────────────────────────────
 * Spine 4.0 的 `SkeletonBounds.update()` **只收集 BoundingBoxAttachment**
 * （碰撞盒附件，用于物理/命中检测）。本项目这 4 套角色资源没有导出任何
 * 碰撞盒附件，于是 polygons 数组为空 → minX=+∞ / maxX=-∞ → 包围盒宽度
 * 变成负数 → 角色被压到最小尺寸（窗口 64x64，角色完全看不见）。
 *
 * 4.1+ 的 `SkeletonBounds` 改成统计所有可绘制附件（region / mesh），
 * 但本项目用的是 4.0.x runtime（与资源格式匹配），所以必须自己算。
 *
 * 做法：遍历所有 slot 的 attachment：
 *  - RegionAttachment → computeWorldVertices(bone, ...) 得 4 个顶点
 *  - MeshAttachment    → computeWorldVertices(slot, ...) 得 N 个顶点
 * 取所有顶点的 min/max 即为角色在世界坐标里的 AABB。
 */
function computeBounds(
  skeleton: Skeleton,
  state: AnimationState,
): { x: number; y: number; width: number; height: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  // 复用缓冲，避免每帧/每次调用都分配
  const regionVerts = new Float32Array(8);
  const meshVerts = new Float32Array(4096);

  const slots = skeleton.slots;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const attachment = slot.getAttachment();
    if (!attachment) continue;

    if (attachment instanceof RegionAttachment) {
      attachment.computeWorldVertices(slot.bone, regionVerts, 0, 2);
      for (let v = 0; v < 4; v++) {
        const x = regionVerts[v * 2];
        const y = regionVerts[v * 2 + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    } else if (attachment instanceof MeshAttachment) {
      const count = attachment.worldVerticesLength;
      if (count <= 0) continue;
      if (count > meshVerts.length) continue; // 顶点数异常，放弃这个附件
      attachment.computeWorldVertices(slot, 0, count, meshVerts, 0, 2);
      for (let v = 0; v < count / 2; v++) {
        const x = meshVerts[v * 2];
        const y = meshVerts[v * 2 + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // 一个可绘制附件都没有（异常资源）→ 退化成一个 1x1 的框
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const width = maxX - minX;
  const height = maxY - minY;
  return {
    x: minX,
    y: minY,
    width: width > 0 ? width : 1,
    height: height > 0 ? height : 1,
  };
}
