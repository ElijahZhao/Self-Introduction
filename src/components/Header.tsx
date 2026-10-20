import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { PersonaConfig, ThemeMode } from '../types';

interface HeaderProps {
  userName: string;
  currentPersona: PersonaConfig;
  themeMode: ThemeMode;
  bgmPlaying: boolean;
  bgmInitialized: boolean;
  sfxEnabled: boolean;
  cursorEnabled: boolean;
  cursorStyle: 'rainbow' | 'star';
  onToggleTheme: () => void;
  onToggleBGM: () => void;
  onToggleSFX: () => void;
  onToggleCursor: () => void;
  onCycleCursorStyle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  currentPersona,
  themeMode,
  bgmPlaying,
  bgmInitialized,
  sfxEnabled,
  cursorEnabled,
  cursorStyle,
  onToggleTheme,
  onToggleBGM,
  onToggleSFX,
  onToggleCursor,
  onCycleCursorStyle,
}) => {
  const isDark = themeMode === 'dark';
  const identityRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(identityRef.current, {
        autoAlpha: 0,
        y: -16,
        duration: 0.7,
        delay: 0.15,
        ease: 'power3.out',
        clearProps: 'transform',
      });
      gsap.from(controlsRef.current, {
        autoAlpha: 0,
        y: -16,
        duration: 0.7,
        delay: 0.28,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-20 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.875rem)] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      {/* Left: Identity Badge & Current Persona Status */}
      <div ref={identityRef} className="glass-panel rounded-2xl px-3.5 py-2 flex items-center gap-3 pointer-events-auto shadow-sm">
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
      <div ref={controlsRef} className="flex items-center gap-2 pointer-events-auto flex-wrap">
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

        {/* Fluid Cursor Toggle */}
        <button
          id="btn-cursor-toggle"
          type="button"
          onClick={onToggleCursor}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title={cursorEnabled ? '关闭流体光标' : '开启流体光标'}
        >
          <span id="cursor-icon">{cursorEnabled ? '💫' : '🚫'}</span>
          <span id="cursor-label" className="hidden sm:inline">
            光标: {cursorEnabled ? '开' : '关'}
          </span>
        </button>

        {/* Fluid Cursor Style Cycle */}
        <button
          id="btn-cursor-style"
          type="button"
          onClick={onCycleCursorStyle}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title={cursorStyle === 'rainbow' ? '切换为星夜流光光标' : '切换为彩虹流体光标'}
        >
          <span id="cursor-style-icon">{cursorStyle === 'rainbow' ? '🌈' : '🌌'}</span>
          <span id="cursor-style-label" className="hidden sm:inline">
            {cursorStyle === 'rainbow' ? '彩虹' : '星夜'}
          </span>
        </button>
      </div>
    </header>
  );
};
