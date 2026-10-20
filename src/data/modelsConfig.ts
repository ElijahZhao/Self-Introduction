import { ModelPreset } from '../types';

/**
 * 3D 主角团：5 个 Q 版手办角色，点击底部导航坞切换。
 * 来源链（披露）：即梦 AI 生成三视图 → 腾讯混元 3D 生成模型 → 需求方本人所有。
 * 资产管线：连通域抽件（正面副本）→ 减面（≤10 万面）→ 贴图 2K WebP → Draco 压缩。
 * 全部为静态模型（无骨骼动画），待机浮动由 ThreeCanvas 的 characterPivot 呼吸位移实现。
 */
export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'char-classic-capybara',
    name: '电竞卡皮',
    source: '即梦 AI 三视图 · 腾讯混元 3D',
    path: 'models/char-classic-capybara.glb',
    desc: '头戴耳机的经典造型，怀抱棕色卡皮巴拉，松弛感拉满的日常分身',
    emoji: '🎧',
    hasAnimations: false,
  },
  {
    id: 'char-scholar',
    name: '学霸极客',
    source: '即梦 AI 三视图 · 腾讯混元 3D',
    path: 'models/char-scholar.glb',
    desc: '圆框眼镜配米色开衫，单手扶镜、怀抱书卷的学霸极客分身',
    emoji: '📚',
    hasAnimations: false,
  },
  {
    id: 'char-worker',
    name: '职场搬砖',
    source: '即梦 AI 三视图 · 腾讯混元 3D',
    path: 'models/char-worker.glb',
    desc: '白衬衫挂工牌，左手咖啡右手公文包，专业感在线的职场分身',
    emoji: '💼',
    hasAnimations: false,
  },
  {
    id: 'char-home',
    name: '居家慵懒',
    source: '即梦 AI 三视图 · 腾讯混元 3D',
    path: 'models/char-home.glb',
    desc: '星星睡衣抱枕头，居家慵懒模式全开的放松分身',
    emoji: '🛋️',
    hasAnimations: false,
  },
  {
    id: 'char-sports',
    name: '足球健将',
    source: '即梦 AI 三视图 · 腾讯混元 3D',
    path: 'models/char-sports.glb',
    desc: '10 号球衣踩着足球，活力四射的运动分身',
    emoji: '⚽',
    hasAnimations: false,
  },
];

export const DEFAULT_MODEL: ModelPreset = MODEL_PRESETS[0];

export const MODEL_IDS = MODEL_PRESETS.map((p) => p.id);
