import React, { createContext, useContext, useState, useCallback } from 'react';

export type Lang = 'zh' | 'en';

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
  /** Pick between a Chinese and English literal by the active language. */
  pick: (zh: string, en: string) => string;
}

export const LangContext = createContext<LangContextValue>({
  lang: 'zh',
  toggleLang: () => {},
  t: (k: string) => k,
  pick: (zh: string, _en: string) => zh,
});

export const useLang = () => useContext(LangContext);

// UI string dictionary. Key -> { zh, en }.
export const UI: Record<string, { zh: string; en: string }> = {
  // Header controls
  'header.theme.dark': { zh: '深色星空', en: 'Dark Space' },
  'header.theme.light': { zh: '明亮展台', en: 'Bright Stage' },
  'header.theme.darkTip': { zh: '切换至沉浸深色太空星轨风', en: 'Switch to dark space theme' },
  'header.theme.lightTip': { zh: '切换至明亮马卡龙白黏土风', en: 'Switch to bright clay theme' },
  'header.bgm.standby': { zh: '治愈 BGM: 待唤醒', en: 'BGM: tap to start' },
  'header.bgm.on': { zh: '治愈 BGM: 开', en: 'BGM: On' },
  'header.bgm.off': { zh: '治愈 BGM: 关', en: 'BGM: Off' },
  'header.bgm.tip': { zh: '切换轻柔钢琴/八音盒背景音乐', en: 'Toggle gentle music box BGM' },
  'header.sfx.on': { zh: 'UI 音效: 开', en: 'SFX: On' },
  'header.sfx.off': { zh: 'UI 音效: 关', en: 'SFX: Off' },
  'header.sfx.tip': { zh: '切换清脆游戏 UI 音效', en: 'Toggle crisp UI sounds' },
  'header.cursor.on': { zh: '光标: 开', en: 'Cursor: On' },
  'header.cursor.off': { zh: '光标: 关', en: 'Cursor: Off' },
  'header.cursor.onTip': { zh: '关闭流体光标', en: 'Disable fluid cursor' },
  'header.cursor.offTip': { zh: '开启流体光标', en: 'Enable fluid cursor' },
  'header.cursor.rainbow': { zh: '彩虹', en: 'Rainbow' },
  'header.cursor.star': { zh: '星夜', en: 'Starry' },
  'header.cursor.rainbowTip': { zh: '切换为星夜流光光标', en: 'Switch to starry cursor' },
  'header.cursor.starTip': { zh: '切换为彩虹流体光标', en: 'Switch to rainbow cursor' },
  'header.fullscreen': { zh: '全屏', en: 'Full' },
  'header.fullscreen.tip': { zh: '沉浸式全屏（导航自动收起，Esc 退出）', en: 'Immersive fullscreen (chrome hides, Esc exits)' },
  'header.exitFullscreen.tip': { zh: '退出全屏', en: 'Exit fullscreen' },
  'header.lang.zh': { zh: '中', en: '中' },
  'header.lang.en': { zh: 'EN', en: 'EN' },
  'header.lang.tip': { zh: '切换中英文', en: 'Switch language' },

  // Dock
  'dock.hint': {
    zh: '拖拽环绕视角 · 点击环绕的土星、纸飞机、能量球与地月打开介绍 · 底部右侧切换主角',
    en: 'Drag to orbit · click Saturn / plane / orb / Moon for details · switch avatars on the right',
  },
  'dock.module.about': { zh: '关于我', en: 'About' },
  'dock.module.projects': { zh: '代表作品', en: 'Projects' },
  'dock.module.hobbies': { zh: '技能图谱', en: 'Skills' },
  'dock.module.contact': { zh: '联络交流', en: 'Contact' },

  // Loading
  'loading.title': { zh: 'Elijah Zhao · 3D Personal Showcase', en: 'Elijah Zhao · 3D Personal Showcase' },
  'loading.subtitle': { zh: '正在构筑三维星轨空间与角色模型', en: 'Building the 3D orbit space & characters' },
  'loading.progress': { zh: '正在构筑展台 ({done}/{total})…', en: 'Building stage ({done}/{total})…' },
  'loading.decor': { zh: '正在补缀环绕装饰 ({done}/{total})…', en: 'Finishing decorations ({done}/{total})…' },
  'loading.ready': { zh: '展台就绪，正在补缀环绕细节…', en: 'Stage ready, finishing details…' },
  'loading.readyShort': { zh: '展台就绪', en: 'Ready' },
  'loading.character': { zh: '正在加载 3D 角色 ({pct}%)...', en: 'Loading 3D character ({pct}%)...' },
  'loading.transfer': { zh: '正在传输 3D 资产数据...', en: 'Transferring 3D assets...' },
};

const STORAGE_KEY = 'avatar_portfolio_lang';

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
      // Browser language heuristic for first visit
      return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    } catch (e) {
      return 'zh';
    }
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'zh' ? 'en' : 'zh';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {}
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = UI[key];
      if (!entry) return key;
      return entry[lang];
    },
    [lang]
  );

  const pick = useCallback(
    (zh: string, en: string) => (lang === 'zh' ? zh : en),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, toggleLang, t, pick }}>
      {children}
    </LangContext.Provider>
  );
};
