import React from 'react';
import { PersonaConfig, ThemeMode } from '../types';

interface HeaderProps {
  userName: string;
  currentPersona: PersonaConfig;
  themeMode: ThemeMode;
  bgmPlaying: boolean;
  bgmInitialized: boolean;
  sfxEnabled: boolean;
  onToggleTheme: () => void;
  onToggleBGM: () => void;
  onToggleSFX: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  currentPersona,
  themeMode,
  bgmPlaying,
  bgmInitialized,
  sfxEnabled,
  onToggleTheme,
  onToggleBGM,
  onToggleSFX,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <header className="fixed top-0 left-0 right-0 z-20 px-4 sm:px-6 pt-3.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      {/* Left: Identity Badge & Current Persona Status */}
      <div className="glass-panel rounded-2xl px-3.5 py-2 flex items-center gap-3 pointer-events-auto shadow-sm">
        <div
          id="persona-avatar-dot"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner transition-colors duration-500"
          style={{ background: isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(91, 168, 255, 0.18)' }}
        >
          {currentPersona.emoji}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              id="header-user-name"
              className={`font-bold text-sm tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
            >
              {userName}
            </span>
            <span
              id="header-persona-tag"
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors duration-300 ${currentPersona.badgeClass}`}
            >
              {currentPersona.name}
            </span>
          </div>
          <p
            id="header-persona-desc"
            className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            {currentPersona.desc}
          </p>
        </div>
      </div>

      {/* Right: Audio Controls & Theme Switch */}
      <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
        {/* Light / Dark Mode Toggle */}
        <button
          id="btn-theme-toggle"
          type="button"
          onClick={onToggleTheme}
          className={`glass-pill px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
            isDark ? 'text-amber-300 hover:text-amber-200' : 'text-slate-700 hover:text-slate-900'
          }`}
          title={isDark ? '切换至明亮马卡龙白黏土风' : '切换至沉浸深色太空星轨风'}
        >
          <span>{isDark ? '🌙' : '☀️'}</span>
          <span className="hidden sm:inline">{isDark ? '深色星空' : '明亮展台'}</span>
        </button>

        {/* BGM Toggle */}
        <button
          id="btn-bgm-toggle"
          type="button"
          onClick={onToggleBGM}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title="切换轻柔钢琴/八音盒背景音乐"
        >
          <span id="bgm-icon">
            {!bgmInitialized ? '🎵' : bgmPlaying ? '🎶' : '🔇'}
          </span>
          <span id="bgm-label" className="hidden sm:inline">
            {!bgmInitialized ? '治愈 BGM: 待唤醒' : bgmPlaying ? '治愈 BGM: 开' : '治愈 BGM: 关'}
          </span>
        </button>

        {/* UI SFX Toggle */}
        <button
          id="btn-sfx-toggle"
          type="button"
          onClick={onToggleSFX}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title="切换清脆游戏 UI 音效"
        >
          <span id="sfx-icon">{sfxEnabled ? '🔔' : '🔕'}</span>
          <span id="sfx-label" className="hidden sm:inline">
            {sfxEnabled ? 'UI 音效: 开' : 'UI 音效: 关'}
          </span>
        </button>
      </div>
    </header>
  );
};
