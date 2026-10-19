import React from 'react';
import { AccessoryState, PersonaId, ThemeMode, BuiltinModelId } from '../types';
import { MODEL_PRESETS } from '../data/modelsConfig';

interface WardrobeFooterProps {
  currentPersonaId: PersonaId;
  accessories: AccessoryState;
  themeMode: ThemeMode;
  activeModelId: BuiltinModelId;
  onSelectModel: (id: BuiltinModelId) => void;
  onSelectPersona: (id: PersonaId) => void;
  onToggleAccessory: (key: keyof AccessoryState) => void;
  onCycleHairColor: () => void;
  onCycleOrbitMobile: () => void;
  onOpenDrawer: () => void;
}

export const WardrobeFooter: React.FC<WardrobeFooterProps> = ({
  currentPersonaId,
  accessories,
  themeMode,
  activeModelId,
  onSelectModel,
  onSelectPersona,
  onToggleAccessory,
  onCycleHairColor,
  onCycleOrbitMobile,
  onOpenDrawer,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col items-center gap-2 pointer-events-none max-w-full">
      {/* 3D Model Preset Selector Dock (Direct GitHub Assets Selection) */}
      <div className="glass-pill rounded-full px-3 py-1 flex items-center gap-1 sm:gap-1.5 pointer-events-auto shadow-sm overflow-x-auto max-w-[96vw]">
        <span className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap pl-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          GitHub 3D 角色库:
        </span>

        {MODEL_PRESETS.map((preset) => {
          const isSelected = activeModelId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectModel(preset.id)}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isSelected
                  ? isDark
                    ? 'bg-sky-500/30 text-sky-300 border border-sky-400/50 shadow-xs'
                    : 'bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs font-bold'
                  : isDark
                  ? 'text-slate-300 hover:bg-white/10'
                  : 'text-slate-600 hover:bg-white/70'
              }`}
              title={`${preset.name} - ${preset.source}`}
            >
              <span>{preset.emoji}</span>
              <span className="hidden xs:inline">{preset.name.split(' ')[0]}</span>
              {preset.hasAnimations && (
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  动效
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectModel('procedural')}
          className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            activeModelId === 'procedural'
              ? isDark
                ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-xs'
                : 'bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs font-bold'
              : isDark
              ? 'text-slate-300 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/70'
          }`}
          title="纯前端代码构建的黏土二头身小人"
        >
          <span>🧸</span>
          <span className="hidden xs:inline">纯代码黏土</span>
        </button>

        <button
          type="button"
          onClick={onOpenDrawer}
          className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
            isDark ? 'text-indigo-300 hover:bg-indigo-950/60' : 'text-indigo-600 hover:bg-indigo-50'
          }`}
          title="上传自定义 .glb 3D 模型"
        >
          <span>📁</span>
          <span className="hidden sm:inline">自定义上传</span>
        </button>
      </div>

      {/* Accessory Micro-Toggles (For DIY Customization) */}
      <div className="glass-pill rounded-full px-3 py-1 flex items-center gap-1.5 sm:gap-2 pointer-events-auto shadow-sm flex-wrap justify-center">
        <span className={`text-[11px] font-semibold px-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          配饰 DIY:
        </span>

        <button
          type="button"
          data-acc="starClip"
          onClick={() => onToggleAccessory('starClip')}
          className={`acc-toggle-btn px-2.5 py-0.5 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
            accessories.starClip
              ? isDark
                ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40 shadow-xs'
                : 'bg-amber-100/90 text-amber-800 shadow-2xs'
              : isDark
              ? 'text-slate-300 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          <span>⭐</span>
          <span>发夹</span>
        </button>

        <button
          type="button"
          data-acc="glasses"
          onClick={() => onToggleAccessory('glasses')}
          className={`acc-toggle-btn px-2.5 py-0.5 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
            accessories.glasses
              ? isDark
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 shadow-xs'
                : 'bg-indigo-100/90 text-indigo-800 shadow-2xs'
              : isDark
              ? 'text-slate-300 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          <span>👓</span>
          <span>眼镜</span>
        </button>

        <button
          type="button"
          data-acc="beret"
          onClick={() => onToggleAccessory('beret')}
          className={`acc-toggle-btn px-2.5 py-0.5 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
            accessories.beret
              ? isDark
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'bg-amber-100/90 text-amber-800 shadow-2xs'
              : isDark
              ? 'text-slate-300 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          <span>🎨</span>
          <span>贝雷帽</span>
        </button>

        <button
          type="button"
          data-acc="headphones"
          onClick={() => onToggleAccessory('headphones')}
          className={`acc-toggle-btn px-2.5 py-0.5 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
            accessories.headphones
              ? isDark
                ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40 shadow-xs'
                : 'bg-sky-100/90 text-sky-800 shadow-2xs'
              : isDark
              ? 'text-slate-300 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          <span>🎧</span>
          <span>耳机</span>
        </button>

        <button
          type="button"
          id="btn-hair-color"
          onClick={onCycleHairColor}
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
            isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white/70'
          }`}
          title="切换角色发色"
        >
          <span>🌈</span>
          <span>换发色</span>
        </button>
      </div>

      {/* Main Persona Outfit Switcher */}
      <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-1.5 sm:gap-2 pointer-events-auto max-w-full overflow-x-auto">
        <button
          type="button"
          data-persona="explorer"
          onClick={() => onSelectPersona('explorer')}
          className={`persona-btn px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            currentPersonaId === 'explorer'
              ? isDark
                ? 'bg-slate-800 text-sky-300 shadow-sm ring-1 ring-sky-500/50'
                : 'bg-white shadow-sm text-slate-800 ring-1 ring-slate-200'
              : isDark
              ? 'text-slate-400 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <span className="text-base">✨</span>
          <div className="text-left">
            <div>水手装 · 探索者</div>
            <div className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              综合简介与初心
            </div>
          </div>
        </button>

        <button
          type="button"
          data-persona="creator"
          onClick={() => onSelectPersona('creator')}
          className={`persona-btn px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            currentPersonaId === 'creator'
              ? isDark
                ? 'bg-slate-800 text-indigo-300 shadow-sm ring-1 ring-indigo-500/50'
                : 'bg-white shadow-sm text-slate-800 ring-1 ring-slate-200'
              : isDark
              ? 'text-slate-400 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <span className="text-base">💻</span>
          <div className="text-left">
            <div>极客卫衣 · 创造者</div>
            <div className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              技术栈与开源作品
            </div>
          </div>
        </button>

        <button
          type="button"
          data-persona="lifestyle"
          onClick={() => onSelectPersona('lifestyle')}
          className={`persona-btn px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            currentPersonaId === 'lifestyle'
              ? isDark
                ? 'bg-slate-800 text-amber-300 shadow-sm ring-1 ring-amber-500/50'
                : 'bg-white shadow-sm text-slate-800 ring-1 ring-slate-200'
              : isDark
              ? 'text-slate-400 hover:bg-white/10'
              : 'text-slate-600 hover:bg-white/60'
          }`}
        >
          <span className="text-base">🦊</span>
          <div className="text-left">
            <div>暖阳针织 · 生活家</div>
            <div className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              摄影、游戏与灵感
            </div>
          </div>
        </button>

        {/* Mobile Quick Orbit Menu Trigger */}
        <button
          type="button"
          id="btn-cycle-orbit"
          onClick={onCycleOrbitMobile}
          className={`lg:hidden px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
            isDark ? 'bg-sky-950/80 text-sky-300 hover:bg-sky-900' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
          }`}
        >
          <span>🪐</span>
          <span>环绕物</span>
        </button>
      </div>
    </footer>
  );
};
