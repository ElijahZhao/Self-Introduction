# 资产清单与授权 / Asset Inventory & Licensing

本文件汇总展台使用的 3D 模型、音频与第三方素材来源。**代码采用 MIT 许可；下列第三方资产不适用 MIT**，各自遵循表中授权。

## 1. 主角模型（5 个）

5 个 Q 版手办角色由作者自备，来源链：

> 即梦 AI 生成三视图 → 腾讯混元 3D 生成模型 → 作者本人所有

| 文件（`public/models/`） | 名称 | 体积 | 三角面 |
|---|---|---|---|
| `char-classic-capybara.glb` | 电竞抱卡皮巴拉版（默认） | 738 KB | 81,544 |
| `char-scholar.glb` | 学霸版 | 812 KB | 87,202 |
| `char-worker.glb` | 打工人版 | 744 KB | 88,076 |
| `char-home.glb` | 居家慵懒版 | 826 KB | 89,540 |
| `char-sports.glb` | 足球运动活力版 | 1.00 MB | 86,584 |

- **资产管线**：连通域抽件（正面带脸副本）→ 减面（≤10 万面）→ 贴图 2K 降采样 WebP → Draco 压缩。
- 角色模型为静态 GLB（无骨骼动画），待机呼吸浮动由 `ThreeCanvas` 的 `characterPivot` 位移实现。
- 版权归仓库作者所有；转载角色渲染图请注明出处。

## 2. 可交互环绕物（4 个）

| 环绕物 | 文件 / 实现 | 授权 |
|---|---|---|
| 🪐 土星（关于我） | `saturn.glb` | 仓库作者提供 |
| ✈️ 折纸飞机（作品） | `ThreeCanvas` 程序化几何，无模型文件 | 代码（MIT） |
| 🎧 地月（联络） | `earth_moon.glb` | 仓库作者提供 |
| 🔮 能量球（技能） | `orb-pickup_sphere-transformed.glb` | [Quaternius Ultimate Space Kit](https://quaternius.com/packs/ultimatespacekit.html)，CC0-1.0 |

## 3. 装饰环绕物（Quaternius，CC0-1.0）

来源：[Quaternius — Ultimate Space Kit](https://quaternius.com/packs/ultimatespacekit.html)

| 文件 | 物件 |
|---|---|
| `orb-planet_5-transformed.glb` | 小行星 |
| `orb-spaceship_finnthefrog-transformed.glb` | 小飞船 |
| `orb-rover_1-transformed.glb` | 月球车 |
| `orb-rover_2-transformed.glb` | 探索车 |

## 4. 场景装饰物（Kenney，CC0-1.0）

来源：[Kenney — Space Kit](https://kenney.nl/assets/space-kit)。静态 GLB、顶点色无贴图、0 骨骼，渲染确定性。

| 文件 | 物件 |
|---|---|
| `decor-speeder.glb` | 悬浮快艇 |
| `decor-satellite-dish.glb` | 卫星天线 |
| `decor-astronaut.glb` | 宇航员 |
| `decor-miner.glb` | 采矿船 |
| `decor-meteor.glb` | 陨石 |

## 5. 场景漫游角色（KayKit / CC-BY）

| 文件 | 物件 | 授权 |
|---|---|---|
| `Knight.glb` | 骑士 | [KayKit — Adventurers](https://kaylousberg.itch.io/adventurers)，CC0-1.0 |
| `Mage.glb` | 法师 | 同上 |
| `Rig_Medium_MovementBasic.glb` | 行走 / 待机动画 | 同上 |
| `Wolf.glb` | 白狼（纯装饰轨道物） | [vinceyanez — Sketchfab](https://sketchfab.com/vinceyanez)，**CC-BY 4.0** |

> **CC-BY 4.0 署名义务**：转载、改编或再分发 `Wolf.glb` 或其衍生渲染时，必须保留对 **vinceyanez** 的署名。仓库内保留本文件即视为署名链的一部分。

## 6. 历史素材（已归档，不参与构建）

`Steve.glb`、`Villager.glb`（vinceyanez，CC-BY）与早期 `Soldier.glb` 已从场景移除、从加载进度清单剔除，存放在 `archive/models/`，**不进 `dist`、不被浏览器请求**。若重新启用，需保留对应授权与署名。

## 7. 解码器与音频

- Draco 解码器：本地分发于 `public/draco/`，不依赖 gstatic CDN，大陆网络可访问。解码器本身遵循其上游 Apache-2.0 许可。
- 语音文件（`public/audio/`）：由仓库作者制作或授权使用，版权归作者所有；未配置时前端回退到浏览器 Web Speech API。

## 授权速查

| 资产类别 | 授权 | 义务 |
|---|---|---|
| 代码、构建脚本、页面模板 | MIT | 保留版权与许可声明 |
| 5 个主角模型、语音文件 | 作者所有 | 转载需注明出处；模型版权归作者所有 |
| Quaternius / Kenney / KayKit 素材 | CC0-1.0 | 无强制署名，本文件仍保留来源 |
| `Wolf.glb`（vinceyanez） | CC-BY 4.0 | **必须署名 vinceyanez** |
| Draco 解码器 | Apache-2.0 | 保留上游许可声明 |

如有授权疑问，请开 issue 或通过仓库主页联系方式沟通。
