import { ModelPreset } from '../types';

export const DEFAULT_MALE_MODEL: ModelPreset = {
  id: 'boy-avatar',
  name: '赵玉林 · 3D 动漫萌系分身',
  source: 'GitHub 开源素材库 (RPG Boy)',
  path: 'models/boy.glb',
  desc: '阳光帅气男生 3D 动漫手办，配有连帽衫与生动呼吸待机骨骼动画',
  emoji: '🧑🏻‍💻',
  hasAnimations: true,
};

export const MODEL_PRESETS: ModelPreset[] = [
  DEFAULT_MALE_MODEL,
];
