# 3D 互动换装个人星轨展台 · 角色美化与素材调研实施方案

为 3D 个人展台引入高品质圆润可爱黏土风 3D 角色素材，升级 Three.js 材质与光影管线，接入经过严选的开源 CC0 游戏级 UI 清脆音效与治愈旋律，并支持明亮黏土轻拟态与沉浸深色星轨双模式无缝切换。

### User Review & Critical Decisions

> [!IMPORTANT]
> 针对您提到的核心痛点（“优化模型，现在太丑了”、“调研 GitHub 现成圆润可爱 3D 小人素材”、“音效与 BGM 素材库”、“深浅模式切换”），我们梳理了以下方案供您确认：

- **3D 角色模型升级方案（双轨并行）**：
  - **精选内置 CC0 模型包**：集成开源界广受好评的 **KayKit Character Pack** / **Kenney 3D Animated Chibi** 风格化低多边形圆润小人模型，具备完整的头身比、圆润躯干以及配饰装配骨骼点。
  - **内置纯代码黏土雕刻模式重构**：若用户未加载外部模型，现有的纯代码黏土小人也将重构几何体（从圆柱体升级为平滑胶囊体、多段贝塞尔发簇、可爱肉嘟嘟圆手与微表情眨眼），摆脱粗糙几何感。
- **声音资产方案**：
  - **清脆 UI 音效**：采用 GitHub 开源知名 **Kenney Interface Sounds & UI Audio**（CC0）高品质按键音频（包含水滴涟漪、清脆开关、纸张展开、闪烁叮咚）。
  - **治愈 BGM**：采用 Web Audio / Tone.js 实时程序化合成的柔和八音盒与电钢琴和弦，无网络加载延迟且跟随穿搭实时变奏。
- **视觉主题升级**：
  - 默认保持精致的**明亮马卡龙白黏土拟态风**，并在顶部导航增加**☀️ / 🌙 深浅模式切换**，深色模式下自动切换为深蓝太空星轨、自发光霓虹地台与半透明暗色毛玻璃。

---

### 1. Overview & Core Concept

- **What It Does**: 提供一个兼具视觉可爱度与专业展示度的 3D 个人互动主页，访客可 360° 拖拽查看圆润角色，通过底部换装栏切换三种生活/工作状态，并点击公转小物件探索站长档案。
- **Target Audience / Persona**: 开发者、设计师、创意技术人员、独立创作者，用于 GitHub Pages 个人作品集、求职自我推介或技术博客门面。
- **Key Value**: 零后端成本、秒开体验、生动有趣的游戏化交互，远优于千篇一律的扁平简历网站。

---

### 2. User Experience & Visual Design

#### A. 视觉语言与深浅双模式
- **浅色模式（默认）**：柔和白/米灰渐变底色（`#f5f6f9` → `#e4e7ef`），暖调微漫反射光，双层发光展台，果冻透光感毛玻璃弹窗。
- **深色模式**：深空蓝黑星轨背景（`#0b0f19` → `#1a2035`），高发光星轨轮廓线，冷光轮廓边缘光（Rim Light），科技感半透明暗晶面板。
- **字体规范**：标题使用现代圆润无衬线体 `Plus Jakarta Sans` / `Outfit` 搭配中文字体 `Noto Sans SC`，数据与标签使用干净的 `tabular-nums` 排版。

#### B. 核心交互流程
1. **入场与环绕**：展台载入后，3D 角色轻柔呼吸浮动，4 大环绕物沿同心星轨平稳公转。
2. **360° 角色拖拽**：鼠标或触控拖拽中央角色，具备平滑转动惯性与弹性回正。
3. **身份联动换装**：
   - 探索者（水手装/日常态）→ 创造者（连帽衫+极客黑框+悬浮电脑/技术态）→ 生活家（针织衫+贝雷帽+复古相机/爱好态）。
   - 换装瞬间触发星尘爆发粒子与欢快跳跃动作。
4. **环绕物探索与涟漪**：点击任一环绕物，脚下扩散 4 重声波光圈，弹出详细毛玻璃卡片，支持一键语音/TTS 朗读。

---

### 3. Key Product Decisions & Trade-Offs

- **决策 1：选用 KayKit / Kenney 风格化开源 3D 角色还是继续手绘几何体？**
  - *选定方案*：双轨兼容。优化内置纯代码黏土小人（换用平滑圆角胶囊与软胶材质参数），同时在项目内置一组轻量化经过优化的 CC0 可爱小人 `.glb` 模型供用户自由切换，保留自定义上传接口。
  - *原因*：纯代码模式零网络请求、首屏 0ms 瞬间渲染；外部 GLB 模型则能满足对高精造型的高阶需求。
- **决策 2：声音文件的打包与播放策略**
  - *选定方案*：小尺寸 UI 清脆音效采用打包 Base64/WAV 缓存，BGM 保持 Tone.js 纯代码合成。
  - *原因*：无需外部音频 CDN 请求，避免因外部链接失效或 CORS 导致无声。
- **决策 3：深浅模式的渲染控制**
  - *选定方案*：将 Three.js 背景色、半球光色温、平行光强弱以及 HTML CSS 变量统一由单一 React ThemeContext 驱动。

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                      React App Shell                   │
│   (ThemeContext: Light / Dark Mode, ProfileConfig)     │
├───────────────┬────────────────────────┬───────────────┤
│ Top Header    │   Three.js 3D Viewport │ Wardrobe Dock │
│ - User Badge  │   - Studio Lighting    │ - Persona Tabs│
│ - BGM Toggle  │   - Cute Chibi Model   │ - Accessory   │
│ - SFX Toggle  │   - 3 Concentric Rings │   DIY Toggles │
│ - Dark Switch │   - 4 Orbit Colliders  │ - Hair Palette│
│ - Config Drawer - 3D Ripple System     │               │
├───────────────┴────────────────────────┴───────────────┤
│                   Interactive Overlays                 │
│   - InfoModal (Cards + Chinese TTS / Audio Readout)    │
│   - FloatingWaveBadge (Screen-Projected 3D Pinned)     │
│   - ConfigDrawer (Profile Edit, GLB & Voice Upload)    │
└────────────────────────────────────────────────────────┘
```

#### 系统数据模型
```typescript
interface PersonaConfig {
  id: 'explorer' | 'creator' | 'lifestyle';
  name: string;
  theme: {
    light: { bgInner: string; bgOuter: string; lightColor: number };
    dark: { bgInner: string; bgOuter: string; lightColor: number };
  };
  outfit: {
    topColor: number;
    collarColor: number;
    skirtColor: number;
    hairColor: number;
    accessories: ('starClip' | 'glasses' | 'beret' | 'headphones')[];
    propType: 'none' | 'laptop' | 'camera';
  };
  modules: Record<'about' | 'projects' | 'hobbies' | 'contact', ModuleData>;
}
```
