import React from 'react';
import { OrbitModuleId, BuiltinModelId, ThemeMode } from '../types';
import { MODEL_PRESETS } from '../data/modelsConfig';

interface PortfolioDockProps {
  activeModelId: BuiltinModelId;
  themeMode: ThemeMode;
  activeOrbitModuleId: OrbitModuleId | null;
  onSelectModule: (id: OrbitModuleId) => void;
  onSelectModel: (id: BuiltinModelId) => void;
}

export const PortfolioDock: React.FC<PortfolioDockProps> = ({
  activeModelId,
  themeMode,
  activeOrbitModuleId,
  onSelectModule,
  onSelectModel,
}) => {
  const isDark = themeMode === 'dark';

  const navItems: { id: OrbitModuleId; emoji: string; title: string; hint: string }[] = [
    { id: 'about', emoji: '🪐', title: '关于我', hint: '土星 · 个人画像' },
    { id: 'projects', emoji: '✈️', title: '代表作品', hint: '纸飞机 · 经历作品' },
    { id: 'hobbies', emoji: '🦊', title: '技能图谱', hint: '小狐狸 · 技术栈' },
    { id: 'contact', emoji: '🎧', title: '联络交流', hint: '地月 · 社交渠道' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col items-center gap-2 pointer-events-none max-w-full">
      {/* Interactive Helper Hint */}
      <div className="glass-pill px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-xs pointer-events-auto transition-opacity opacity-90 hover:opacity-100">
        <span className="text-sky-500 animate-pulse">●</span>
        <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
          3D 展台可自由拖拽旋转 · 点击环绕的土星、狐狸与纸飞机打开介绍 · 底部右侧切换主角
        </span>
      </div>

      {/* Main Portfolio Navigation Dock */}
      <div className="glass-panel rounded-2xl sm:rounded-full px-3.5 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2.5 pointer-events-auto shadow-md max-w-full overflow-x-auto">
        {/* Module Triggers */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {navItems.map((item) => {
            const isActive = activeOrbitModuleId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectModule(item.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
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

        <div className={`h-4 w-px mx-0.5 sm:mx-1 shrink-0 ${isDark ? 'bg-white/15' : 'bg-slate-300/80'}`} />

        {/* 3D 主角团切换（5 个手办模型） */}
        <div className="flex items-center gap-1">
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
                title={`${model.name} · ${model.desc}`}
              >
                <span className="text-sm">{model.emoji}</span>
                <span className="hidden md:inline text-[11px]">{model.name.replace(/版$/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
