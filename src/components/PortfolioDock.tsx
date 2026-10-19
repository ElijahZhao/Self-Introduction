import React from 'react';
import { OrbitModuleId, PersonaId, ThemeMode } from '../types';

interface PortfolioDockProps {
  currentPersonaId: PersonaId;
  themeMode: ThemeMode;
  activeOrbitModuleId: OrbitModuleId | null;
  onSelectModule: (id: OrbitModuleId) => void;
  onSelectPersona: (id: PersonaId) => void;
  onOpenDrawer: () => void;
}

export const PortfolioDock: React.FC<PortfolioDockProps> = ({
  currentPersonaId,
  themeMode,
  activeOrbitModuleId,
  onSelectModule,
  onSelectPersona,
  onOpenDrawer,
}) => {
  const isDark = themeMode === 'dark';

  const navItems: { id: OrbitModuleId; emoji: string; title: string; hint: string }[] = [
    { id: 'about', emoji: '🪐', title: '关于我', hint: '土星 · 个人画像' },
    { id: 'projects', emoji: '✈️', title: '代表作品', hint: '纸飞机 · 经历作品' },
    { id: 'hobbies', emoji: '🦊', title: '技能图谱', hint: '小狐狸 · 技术栈' },
    { id: 'contact', emoji: '🎧', title: '联络交流', hint: '地月 · 社交渠道' },
  ];

  const personas: { id: PersonaId; emoji: string; name: string }[] = [
    { id: 'explorer', emoji: '🧑🏻‍💻', name: '个人介绍' },
    { id: 'creator', emoji: '⚡', name: '深度工程' },
    { id: 'lifestyle', emoji: '🌿', name: '生活常态' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col items-center gap-2 pointer-events-none max-w-full">
      {/* Interactive Helper Hint */}
      <div className="glass-pill px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5 shadow-xs pointer-events-auto transition-opacity opacity-90 hover:opacity-100">
        <span className="text-sky-500 animate-pulse">●</span>
        <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
          3D 展台可自由拖拽旋转 · 点击环绕的土星、狐狸与纸飞机打开介绍
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

        <div className={`h-4 w-px mx-0.5 sm:mx-1 ${isDark ? 'bg-white/15' : 'bg-slate-300/80'}`} />

        {/* Persona Mode Switch */}
        <div className="flex items-center gap-1">
          {personas.map((p) => {
            const isCurrent = currentPersonaId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPersona(p.id)}
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[11px] transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? isDark
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 font-semibold'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={`切换为「${p.name}」模式`}
              >
                <span>{p.emoji}</span>
                <span className="hidden md:inline">{p.name}</span>
              </button>
            );
          })}

          {/* Quick Drawer trigger */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className={`p-1.5 rounded-full text-xs transition cursor-pointer ml-0.5 ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
            title="自定义个人信息与设置"
            aria-label="打开设置"
          >
            ⚙️
          </button>
        </div>
      </div>
    </footer>
  );
};
