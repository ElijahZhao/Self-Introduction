# 备用素材 · Minecraft/乐高风格小人物

> 用途：Self-Introduction 3D 展台"场景走动互动小人"素材。
> 当前状态：**Knight（骑士）与 Mage（法师）已接入场景**（漫游方块小人，绕展台折线路径 idle↔walk 状态机，动画取自 Rig_Medium_MovementBasic 同 rig 骨骼）；其余素材仍为备用。

## 素材清单（9 个 GLB，共 8.1MB）

| 文件 | 大小 | 来源 | 许可 | 说明 |
|---|---|---|---|---|
| `Knight.glb` | 341KB | KayKit Adventurers | CC0 | 骑士·低模乐高小人风格 |
| `Mage.glb` | 352KB | KayKit Adventurers | CC0 | 法师·低模小人 |
| `Rogue.glb` | 409KB | KayKit Adventurers | CC0 | 游侠·低模小人 |
| `Mannequin_Medium.glb` | 420KB | KayKit Character Animations | CC0 | 人偶·中性造型 |
| `Rig_Medium_MovementBasic.glb` | 690KB | KayKit Adventurers | CC0 | **通用移动动画**（idle/walk 等，可挂到小人骨骼） |
| `Soldier.glb` | 2.1MB | three.js 官方示例（mrdoob/three.js） | MIT/CC0 兼容 | 低模兵人·自带 12 个动画 |
| `Xbot.glb` | 2.9MB | three.js 官方示例 | MIT | 基础人形·自带 9 个动画 |
| `Stork.glb` | 75KB | three.js 官方示例 | MIT | 鹳鸟（备用） |
| `space-avatar-parts.glb` | 1.0MB | series-ai/jam-ready-assets · run-voxel-space | CC0 | **方块体素角色**（最接近 Minecraft 观感） |

## 来源与许可

- **KayKit / series-ai/jam-ready-assets**：`https://github.com/series-ai/jam-ready-assets`，CC0（公有领域，可商用免署名），Git LFS 托管。
- **three.js 官方示例模型**：`https://github.com/mrdoob/three.js`（dev/examples/models/gltf/），MIT 许可。
- 均不涉及 Mojang/Minecraft 官方版权资产；如需严格"Steve 方块人"外观需自行用 MagicaVoxel/Blockbench 建模（或改用 CC0 体素角色 space-avatar）。

## 后续接入建议（未执行）

1. 优先候选：`space-avatar-parts.glb`（方块观感）+ `Rig_Medium_MovementBasic.glb`（移动动画）组合，或直接 `Soldier.glb`（自带动画，GLTFLoader 零改动）。
2. 加入场景时：放 `public/models/`，在 ThreeCanvas 的环绕物/装饰物加载链路中登记路径（参考 `getModelCandidateUrls` 嗅探机制，防 GitHub Pages 子路径 404）。
3. 动画播放用 `AnimationMixer`，与现有角色切换/出场动画互不冲突。
4. 若走"走动互动"路线，需在渲染循环加漫游路径插值（参考早期动物漫游方案，已被否决移除——如复用需重新设计防遮挡）。

## 下载时间

2026-10-21（本次会话）。
