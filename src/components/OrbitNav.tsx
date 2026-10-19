import React from 'react';
import { OrbitModuleId } from '../types';

interface OrbitNavProps {
  activeModuleId: OrbitModuleId | null;
  onSelectModule: (id: OrbitModuleId) => void;
}

export const OrbitNav: React.FC<OrbitNavProps> = ({ activeModuleId, onSelectModule }) => {
  const items: { id: OrbitModuleId; emoji: string; title: string; subtitle: string }[] = [
    { id: 'about', emoji: '🪐', title: '关于我', subtitle: '内轨 · 环绕星球' },
    { id: 'projects', emoji: '✈️', title: '作品与经历', subtitle: '中轨 · 折纸飞机' },
    { id: 'hobbies', emoji: '🦊', title: '兴趣与日常', subtitle: '外轨 · 萌系小狐狸' },
    { id: 'contact', emoji: '🎧', title: '联系与电台', subtitle: '外轨 · 悬浮星音盒' },
  ];

  return (
    <aside className="fixed left-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-2 pointer-events-auto">
      <div className="text-[11px] font-medium text-slate-400 px-1 mb-0.5 tracking-wider uppercase">
        星轨模块导航
      </div>
      {items.map((item) => {
        const isActive = activeModuleId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            data-orbit-id={item.id}
            onClick={() => onSelectModule(item.id)}
            className={`orbit-quick-btn glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-white/95 transition flex items-center gap-2 text-left group cursor-pointer ${
              isActive ? 'ring-2 ring-sky-400 bg-white' : ''
            }`}
          >
            <span className="text-base group-hover:scale-110 transition-transform">
              {item.emoji}
            </span>
            <div>
              <div className="font-semibold text-slate-800">{item.title}</div>
              <div className="text-[10px] text-slate-400">{item.subtitle}</div>
            </div>
          </button>
        );
      })}
    </aside>
  );
};
