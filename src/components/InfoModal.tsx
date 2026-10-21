import React from 'react';
import { OrbitModuleId, PersonaConfig, PersonaId, ThemeMode } from '../types';
import { useLang } from '../i18n';

interface InfoModalProps {
  isOpen: boolean;
  moduleId: OrbitModuleId | null;
  currentPersona: PersonaConfig;
  themeMode: ThemeMode;
  isSpeaking: boolean;
  onClose: () => void;
  onPlayVoice: (textToRead: string) => void;
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
  if (!moduleId) return null;
  const mod = currentPersona.modules[moduleId];
  if (!mod) return null;

  const isDark = themeMode === 'dark';
  const { pick, lang } = useLang();

  const emojiMap: Record<OrbitModuleId, string> = {
    about: '🪐',
    projects: '✈️',
    hobbies: '🦊',
    contact: '🎧',
  };

  const handleSpeakerClick = () => {
    onPlayVoice(`${pick(mod.title, mod.titleEn || mod.title)}。${pick(mod.text, mod.textEn || mod.text)}`);
  };

  return (
    <div
      id="info-modal-wrapper"
      className={`fixed left-1/2 top-1/2 z-30 w-[92vw] max-w-[490px] ${isOpen ? 'open' : ''}`}
    >
      <div id="info-modal-card" className="glass-modal rounded-[26px] p-6 sm:p-7 relative overflow-hidden">
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
        <div
          id="modal-body"
          className={`text-sm leading-relaxed space-y-2.5 pr-10 max-h-[44vh] overflow-y-auto ${
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
