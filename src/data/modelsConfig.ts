import { ModelPreset } from '../types';

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'gemini-chan',
    name: 'Gemini-chan 3D 萌娘',
    source: 'GitHub: pathetic777/gemini-chan',
    path: 'models/gemini_chan.glb',
    desc: '精致日系 3D 二次元萌娘手办，配有星芒发卡、百褶裙与靴子，自带骨骼动作',
    emoji: '✨',
    hasAnimations: true,
  },
  {
    id: 'crimson-chibi',
    name: 'Crimson Q版双马尾',
    source: 'GitHub: aiasioooo/crimson-chibi',
    path: 'models/crimson_chibi.glb',
    desc: '折纸可爱手办风 Q 版双马尾小人，199 处精细网格与 35 种材质分色',
    emoji: '🎀',
    hasAnimations: false,
  },
  {
    id: 'kaykit-mage',
    name: 'KayKit 黏土法师',
    source: 'GitHub: KayKit Character Pack',
    path: 'models/kaykit_mage.glb',
    desc: '开源知名 CC0 游戏级低模可爱法师小人，圆润兜帽与法袍',
    emoji: '🧙',
    hasAnimations: false,
  },
  {
    id: 'kaykit-knight',
    name: 'KayKit 黏土骑士',
    source: 'GitHub: KayKit Character Pack',
    path: 'models/kaykit_knight.glb',
    desc: 'Q 萌二头身圆润小骑士，自带头盔羽饰与盾剑装备',
    emoji: '🛡️',
    hasAnimations: false,
  },
  {
    id: 'robot-expressive',
    name: 'Expressive 灵动机器人',
    source: 'Three.js 官方动画素材库',
    path: 'models/robot_expressive.glb',
    desc: 'Three.js 官方活泼卡通机器人，具备舞蹈、眨眼、挥手等多段生动骨骼动画',
    emoji: '🤖',
    hasAnimations: true,
  },
];
