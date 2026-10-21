import React from 'react';
import { OrbitModuleId, BuiltinModelId, ThemeMode } from '../types';
import { MODEL_PRESETS } from '../data/modelsConfig';
import { useLang } from '../i18n';

interface PortfolioDockProps {
  activeModelId: BuiltinModelId;
  themeMode: ThemeMode;
  activeOrbitModuleId: OrbitModuleId | null;
  immersive: boolean;
  onSelectModule: (id: OrbitModuleId) => void;
  onSelectModel: (id: BuiltinModelId) => void;
}

export const PortfolioDock: React.FC<PortfolioDockProps> = ({
  activeModelId,
  themeMode,
  activeOrbitModuleId,
  immersive,
  onSelectModule,
  onSelectModel,
}) => {
  const isDark = themeMode === 'dark';
  const { t, pick } = useLang();

  const navItems: { id: OrbitModuleId; emoji: string; title: string; hint: string }[] = [
    { id: 'about', emoji: '🪐', title: pick('关于我','About'), hint: pick('土星 · 个人画像','Saturn · Profile') },
    { id: 'projects', emoji: '✈️', title: pick('代表作品','Projects'), hint: pick('纸飞机 · 经历作品','Plane · Work') },
    { id: 'hobbies', emoji: '🔮', title: pick('技能图谱','Skills'), hint: pick('能量球 · 技术栈','Orb · Stack') },
    { id: 'contact', emoji: '🎧', title: pick('联络交流','Contact'), hint: pick('地月 · 社交渠道','Moon · Channels') },
  ];

  return (
    <footer className={`fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex flex-col items-center gap-2 pointer-events-none max-w-full transition-opacity duration-300 ${immersive ? 'opacity-0 pointer-events-none' : ''}`}>
      {/* Interactive Helper Hint */}
      <div className="glass-pill px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-xs pointer-events-auto transition-opacity opacity-90 hover:opacity-100">
        <span className="text-sky-500 animate-pulse">●</span>
        <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
          {t('dock.hint')}
        </span>
      </div>

      {/* Main Portfolio Navigation Dock: single row on desktop, stacked
          module + persona rows on narrow/mobile screens so nothing is
          hidden behind the horizontal scroll edge. */}
      <div className="glass-panel rounded-2xl sm:rounded-full px-3.5 py-1.5 sm:py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1 sm:gap-2.5 pointer-events-auto shadow-md max-w-full overflow-x-auto">
        {/* Module Triggers */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5 shrink-0">
          {navItems.map((item) => {
            const isActive = activeOrbitModuleId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm font-semibold'
                    : isDark
                    ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                    : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                }`}
                title={item.hint}
              >
                <span className="text-sm">{item.emoji}</span>
                <span className="text-[11px] sm:text-xs">{item.title}</span>
              </button>
            );
          })}
        </div>

        <div className={`h-px w-full sm:h-4 sm:w-px mx-0.5 sm:mx-1 shrink-0 ${isDark ? 'bg-white/15' : 'bg-slate-300/80'}`} />

        {/* 3D 主角团切换（5 个手办模型） */}
        <div className="flex items-center justify-between gap-1 shrink-0">
          {MODEL_PRESETS.map((model) => {
            const isCurrent = activeModelId === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelectModel(model.id)}
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[11px] transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? isDark
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 font-semibold'
                      : 'bg-indigo-500/15 text-indigo-600 border border-indigo-400/50 font-semibold'
                    : isDark
                    ? 'text-slate-400 hover:bg-white/10 hover:text-white border border-transparent'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-900 border border-transparent'
                }`}
                title={pick(`${model.name} · ${model.desc}`, `${model.nameEn || model.name} · ${model.descEn || model.desc}`)}
              >
                <span className="text-sm">{model.emoji}</span>
                <span className="hidden min-[480px]:inline text-[11px]">{pick(model.name.replace(/版$/, ''), model.nameEn || model.name)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
