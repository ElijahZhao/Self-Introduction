import React, { useEffect, useRef, useState } from 'react';
import { OrbitModuleId, PersonaConfig, PersonaId, ThemeMode } from '../types';
import { useLang } from '../i18n';

interface InfoModalProps {
  isOpen: boolean;
  moduleId: OrbitModuleId | null;
  currentPersona: PersonaConfig;
  themeMode: ThemeMode;
  isSpeaking: boolean;
  onClose: () => void;
  onPlayVoice: (textToRead: string, voiceKey: string) => void;
  onSwitchPersona: (personaId: PersonaId) => void;
  onCopyText: (text: string) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  moduleId,
  currentPersona,
  themeMode,
  isSpeaking,
  onClose,
  onPlayVoice,
  onSwitchPersona,
  onCopyText,
}) => {
  // Declared before the early returns: the scroll affordance below needs stable
  // hook order even when moduleId is null for a closed modal.
  const { pick, lang } = useLang();
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ can: false, atEnd: true });

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) {
      setScrollState({ can: false, atEnd: true });
      return;
    }
    const measure = () => {
      const overflow = el.scrollHeight - el.clientHeight > 8;
      setScrollState({
        can: overflow,
        atEnd: !overflow || el.scrollTop + el.clientHeight >= el.scrollHeight - 8,
      });
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // Content reflows after fonts/layout settle; measure once more.
    const timer = window.setTimeout(measure, 400);
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
  }, [isOpen, moduleId, lang, currentPersona.id]);

  // Dialog semantics: Esc closes, focus moves into the card on open and returns
  // to the trigger on close. Without this, keyboard users had no way out of a
  // modal that visually covers the dock they came from.
  useEffect(() => {
    if (!isOpen || !moduleId) return;
    const previous = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // A JS-triggered open (or a click that never focused the dock button) leaves
      // `previous` as body; blurring the card is better than parking focus on an
      // element that is about to be hidden.
      if (previous && previous !== document.body) previous.focus?.();
      else cardRef.current?.blur();
    };
  }, [isOpen, moduleId, onClose]);

  if (!moduleId) return null;
  const mod = currentPersona.modules[moduleId];
  if (!mod) return null;

  const isDark = themeMode === 'dark';

  const emojiMap: Record<OrbitModuleId, string> = {
    about: '🪐',
    projects: '✈️',
    hobbies: '🔮',
    contact: '🎧',
  };

  const handleSpeakerClick = () => {
    onPlayVoice(
      `${pick(mod.title, mod.titleEn || mod.title)}。${pick(mod.text, mod.textEn || mod.text)}`,
      `${currentPersona.id}-${moduleId}`
    );
  };

  return (
    <div
      id="info-modal-wrapper"
      className={`fixed left-1/2 top-1/2 z-30 w-[92vw] max-w-[490px] ${isOpen ? 'open' : ''}`}
    >
      <div
        id="info-modal-card"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="glass-modal rounded-[26px] p-6 sm:p-7 relative overflow-hidden outline-none"
      >
        {/* Subtle top highlight bar */}
        <div
          id="modal-accent-bar"
          className="absolute top-0 left-6 right-6 h-1 rounded-b-full opacity-80 transition-colors duration-300"
          style={{ background: `linear-gradient(90deg, ${currentPersona.accentHex}, #9fd4ff)` }}
        />

        {/* Close Button */}
        <button
          id="btn-close-modal"
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition text-lg leading-none cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
          aria-label={pick('关闭弹窗','Close')}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-3 pr-8">
          <span id="modal-icon" className="text-xl">
            {emojiMap[moduleId]}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="modal-title"
                className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
              >
                {pick(mod.title, mod.titleEn || mod.title)}
              </h2>
              <span
                id="modal-persona-badge"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${currentPersona.badgeClass}`}
              >
                {pick(currentPersona.name, currentPersona.nameEn || currentPersona.name)}
              </span>
            </div>
            <p id="modal-subtitle" className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {pick(mod.subtitle, mod.subtitleEn || mod.subtitle)}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative">
        <div
          id="modal-body"
          ref={bodyRef}
          className={`text-sm leading-relaxed space-y-2.5 pr-10 max-h-[46vh] sm:max-h-[52vh] overflow-y-auto ${
            isDark ? 'text-slate-200' : 'text-slate-700'
          }`}
        >
          <p id="modal-text-main" className="whitespace-pre-line">
            {pick(mod.text, mod.textEn || mod.text)}
          </p>

          {/* Project Cards (projects module only) */}
          {moduleId === 'projects' && mod.projectList && mod.projectList.length > 0 && (
            <div className="space-y-3 pt-1">
              {mod.projectList.map((proj, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-3.5 border-l-4 shadow-xs ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white/70 border-slate-200'
                  }`}
                  style={{ borderLeftColor: proj.accent || '#5ba8ff' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        {pick(proj.name, proj.nameEn || proj.name)}
                      </h3>
                      <p className="text-[11px] font-medium mt-0.5" style={{ color: proj.accent || '#5ba8ff' }}>
                        {pick(proj.tagline, proj.taglineEn || proj.tagline)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {pick(proj.desc, proj.descEn || proj.desc)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(proj.techEn && lang === 'en' ? proj.techEn : proj.tech).map((t, i) => (
                      <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isDark ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>{t}</span>
                    ))}
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {(proj.highlightsEn && lang === 'en' ? proj.highlightsEn : proj.highlights).map((h, i) => (
                      <li key={i} className={`text-[11px] flex gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span style={{ color: proj.accent || '#5ba8ff' }}>▸</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {proj.demoUrl && (
                      <a href={proj.demoUrl} target="_blank" rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white transition hover:opacity-90 cursor-pointer"
                        style={{ background: proj.accent || '#5ba8ff' }}>
                        🔗 {pick('在线 Demo', 'Live Demo')}
                      </a>
                    )}
                    {proj.demoUrl2 && (
                      <a href={proj.demoUrl2} target="_blank" rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white transition hover:opacity-90 cursor-pointer"
                        style={{ background: proj.accent || '#5ba8ff', opacity: 0.85 }}>
                        🔬 {pick('研究 Demo', 'Research Demo')}
                      </a>
                    )}
                    <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer"
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}>
                      🐙 {pick('源码', 'Source')}
                    </a>
                  </div>
                </div>
              ))}
              {mod.otherRepos && mod.otherRepos.length > 0 && (
                <div className={`rounded-xl p-3 mt-1 ${isDark ? 'bg-slate-800/40' : 'bg-slate-50/80'}`}>
                  <p className={`text-[11px] font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pick('📦 其他仓库…', '📦 Other repositories…')}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {mod.otherRepos.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className={`text-[11px] underline-offset-2 hover:underline cursor-pointer ${isDark ? 'text-slate-400 hover:text-sky-300' : 'text-slate-500 hover:text-sky-600'}`}>
                        {r.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {mod.tags && mod.tags.length > 0 && (
            <div id="modal-tags" className="flex flex-wrap gap-1.5 pt-1">
              {(mod.tagsEn && lang === 'en' ? mod.tagsEn : mod.tags).map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border shadow-2xs ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                      : 'bg-white/80 border-white text-slate-700'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Links */}
          {mod.links && mod.links.length > 0 && (
            <div id="modal-links" className="pt-1 flex flex-wrap gap-2">
              {mod.links.map((lnk, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (lnk.actionPersona) {
                      onSwitchPersona(lnk.actionPersona);
                    } else if (lnk.copyText) {
                      onCopyText(lnk.copyText);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-xs cursor-pointer ${
                    isDark
                      ? 'bg-sky-600 hover:bg-sky-500 text-white'
                      : 'bg-slate-800/90 hover:bg-slate-900 text-white'
                  }`}
                >
                  {pick(lnk.label, lnk.labelEn || lnk.label)}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Phones clip roughly half the copy at 44vh; without this fade the card
            looks complete and the rest of the content is never discovered. */}
        {scrollState.can && !scrollState.atEnd && (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 flex items-end justify-center bg-gradient-to-t ${
              isDark ? 'from-slate-900/85' : 'from-white/95'
            } to-transparent`}
          >
            <span
              className={`pb-0.5 text-[11px] font-medium tracking-wide ${
                isDark ? 'text-sky-300/90' : 'text-sky-600/90'
              }`}
            >
              {pick('↓ 下滑查看全部内容', '↓ Scroll for the rest')}
            </span>
          </div>
        )}
        </div>

        {/* Bottom Audio Bar */}
        <div
          className={`mt-4 flex items-center justify-between pt-2 border-t ${
            isDark ? 'border-white/10' : 'border-white/50'
          }`}
        >
          <div
            className={`flex items-center gap-2 text-[11px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span
              id="voice-status-dot"
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-sky-500 animate-ping' : isDark ? 'bg-slate-600' : 'bg-slate-300'
              }`}
            />
            <span id="voice-status-text">
              {isSpeaking
                ? pick('正在为你语音朗读卡片介绍...','Reading this card aloud...')
                : pick('点击右侧喇叭收听语音介绍','Click the speaker to listen')}
            </span>
          </div>

          <button
            id="btn-play-voice"
            type="button"
            onClick={handleSpeakerClick}
            className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition group cursor-pointer ${
              isDark
                ? 'bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200'
                : 'bg-white/85 hover:bg-white border border-white text-slate-700'
            } ${isSpeaking ? 'ring-2 ring-sky-400 bg-sky-500/20' : ''}`}
            title={pick('播放语音介绍 / 朗读','Play voice intro')}
          >
            <svg
              id="speaker-svg"
              className="w-5 h-5 text-current group-hover:text-sky-400 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path id="speaker-wave-1" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path id="speaker-wave-2" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
