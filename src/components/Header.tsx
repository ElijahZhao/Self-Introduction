import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { PersonaConfig, ThemeMode } from '../types';
import { useLang } from '../i18n';

interface HeaderProps {
  userName: string;
  currentPersona: PersonaConfig;
  themeMode: ThemeMode;
  bgmPlaying: boolean;
  bgmInitialized: boolean;
  sfxEnabled: boolean;
  cursorEnabled: boolean;
  cursorStyle: 'rainbow' | 'star';
  immersive: boolean;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
  onToggleBGM: () => void;
  onToggleSFX: () => void;
  onToggleCursor: () => void;
  onSetCursorStyle: (style: 'rainbow' | 'star') => void;
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
  immersive,
  onToggleFullscreen,
  onToggleTheme,
  onToggleBGM,
  onToggleSFX,
  onToggleCursor,
  onSetCursorStyle,
}) => {
  const isDark = themeMode === 'dark';
  const { t, pick, lang, toggleLang } = useLang();
  const identityRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [cursorMenuOpen, setCursorMenuOpen] = useState(false);
  const cursorMenuRef = useRef<HTMLDivElement>(null);

  // Close cursor style dropdown when clicking outside
  useEffect(() => {
    if (!cursorMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (cursorMenuRef.current && !cursorMenuRef.current.contains(e.target as Node)) {
        setCursorMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cursorMenuOpen]);

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
    <>
      {/* Immersive-mode floating exit button (the only chrome kept in fullscreen) */}
      {immersive && (
        <button
          id="btn-exit-fullscreen"
          type="button"
          onClick={onToggleFullscreen}
          className="fixed top-3 right-3 z-30 glass-pill w-10 h-10 rounded-full flex items-center justify-center text-sm cursor-pointer shadow-md transition hover:scale-105"
          title={t('header.exitFullscreen.tip')}
        >
          ⛶
        </button>
      )}
    <header className={`fixed top-0 left-0 right-0 z-20 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.875rem)] flex flex-wrap items-center justify-between gap-2 pointer-events-none transition-opacity duration-300 ${immersive ? 'opacity-0 pointer-events-none' : ''}`}>
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
              {pick(currentPersona.name, currentPersona.nameEn || currentPersona.name)}
            </span>
          </div>
          <p
            id="header-persona-desc"
            className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            {pick(currentPersona.desc, currentPersona.descEn || currentPersona.desc)}
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
          title={isDark ? t('header.theme.lightTip') : t('header.theme.darkTip')}
        >
          <span>{isDark ? '🌙' : '☀️'}</span>
          <span className="hidden sm:inline">{isDark ? t('header.theme.dark') : t('header.theme.light')}</span>
        </button>

        {/* BGM Toggle */}
        <button
          id="btn-bgm-toggle"
          type="button"
          onClick={onToggleBGM}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title={t('header.bgm.tip')}
        >
          <span id="bgm-icon">
            {!bgmInitialized ? '🎵' : bgmPlaying ? '🎶' : '🔇'}
          </span>
          <span id="bgm-label" className="hidden sm:inline">
            {!bgmInitialized ? t('header.bgm.standby') : bgmPlaying ? t('header.bgm.on') : t('header.bgm.off')}
          </span>
        </button>

        {/* UI SFX Toggle */}
        <button
          id="btn-sfx-toggle"
          type="button"
          onClick={onToggleSFX}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title={t('header.sfx.tip')}
        >
          <span id="sfx-icon">{sfxEnabled ? '🔔' : '🔕'}</span>
          <span id="sfx-label" className="hidden sm:inline">
            {sfxEnabled ? t('header.sfx.on') : t('header.sfx.off')}
          </span>
        </button>

        {/* Fluid Cursor: toggle + style dropdown (2-in-1) */}
        <div ref={cursorMenuRef} className="relative flex items-center">
          <button
            id="btn-cursor-toggle"
            type="button"
            onClick={onToggleCursor}
            className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer rounded-r-none"
            title={cursorEnabled ? t('header.cursor.onTip') : t('header.cursor.offTip')}
          >
            <span id="cursor-icon">{cursorEnabled ? '💫' : '🚫'}</span>
            <span id="cursor-label" className="hidden sm:inline">
              {cursorEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            id="btn-cursor-menu"
            type="button"
            onClick={() => setCursorMenuOpen((v) => !v)}
            className={`glass-pill px-2 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center cursor-pointer rounded-l-none border-l border-white/40 ${cursorMenuOpen ? 'bg-white/90' : ''}`}
            title={cursorStyle === 'rainbow' ? t('header.cursor.rainbowTip') : t('header.cursor.starTip')}
          >
            <span className="text-sm">{cursorStyle === 'rainbow' ? '🌈' : '🌌'}</span>
            <span className={`text-[10px] ml-0.5 transition-transform ${cursorMenuOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {cursorMenuOpen && (
            <div className="absolute top-full right-0 mt-2 z-40 glass-panel rounded-xl p-1.5 shadow-lg min-w-[140px]">
              <button
                type="button"
                onClick={() => { onSetCursorStyle('rainbow'); setCursorMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${cursorStyle === 'rainbow' ? 'bg-sky-100/80 text-sky-700' : 'text-slate-600 hover:bg-white/60'}`}
              >
                <span>🌈</span>
                <span>{t('header.cursor.rainbow')}</span>
                {cursorStyle === 'rainbow' && <span className="ml-auto text-sky-500">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => { onSetCursorStyle('star'); setCursorMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${cursorStyle === 'star' ? 'bg-indigo-100/80 text-indigo-700' : 'text-slate-600 hover:bg-white/60'}`}
              >
                <span>🌌</span>
                <span>{t('header.cursor.star')}</span>
                {cursorStyle === 'star' && <span className="ml-auto text-indigo-500">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Language Toggle */}
        <button
          id="btn-lang"
          type="button"
          onClick={toggleLang}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
          title={t('header.lang.tip')}
        >
          🌐 {lang === 'zh' ? 'EN' : '中'}
        </button>

        {/* Immersive Fullscreen Toggle */}
        <button
          id="btn-fullscreen"
          type="button"
          onClick={onToggleFullscreen}
          className="glass-pill px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
          title={t('header.fullscreen.tip')}
        >
          <span>⛶</span>
          <span className="hidden sm:inline">全屏</span>
        </button>
      </div>
    </header>
    </>
  );
};
