import React, { useState, useEffect } from 'react';
import { ThemeMode, BuiltinModelId } from '../types';
import { MODEL_PRESETS } from '../data/modelsConfig';

interface ConfigDrawerProps {
  isOpen: boolean;
  themeMode: ThemeMode;
  userName: string;
  aboutText: string;
  hasCustomVoice: boolean;
  customVoiceFileName: string | null;
  activeModelId: BuiltinModelId;
  onClose: () => void;
  onSelectModel: (id: BuiltinModelId) => void;
  onUploadVoice: (file: File) => void;
  onClearVoice: () => void;
  onUploadModel: (file: File) => void;
  onResetModel: () => void;
  onSaveProfile: (name: string, aboutText: string) => void;
}

export const ConfigDrawer: React.FC<ConfigDrawerProps> = ({
  isOpen,
  themeMode,
  userName,
  aboutText,
  hasCustomVoice,
  customVoiceFileName,
  activeModelId,
  onClose,
  onSelectModel,
  onUploadVoice,
  onClearVoice,
  onUploadModel,
  onResetModel,
  onSaveProfile,
}) => {
  const [inputName, setInputName] = useState(userName);
  const [inputAbout, setInputAbout] = useState(aboutText);
  const isDark = themeMode === 'dark';

  useEffect(() => {
    setInputName(userName);
  }, [userName]);

  useEffect(() => {
    setInputAbout(aboutText);
  }, [aboutText]);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVoice(file);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadModel(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(inputName, inputAbout);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        id="config-drawer-backdrop"
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        id="config-drawer"
        className={`fixed top-0 right-0 bottom-0 w-full max-w-md glass-panel z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200/70'}`}>
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              3D 展台主角与个人介绍设置
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              精选 GitHub 开源男生 3D 角色模型 · 围绕个人介绍打造的 3D 星轨展台
            </p>
          </div>
          <button
            id="btn-close-drawer"
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            ✕
          </button>
        </div>

        <div className={`p-5 overflow-y-auto flex-1 space-y-5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {/* 1. GitHub 3D Character Model */}
          <div className={`p-3.5 rounded-2xl border shadow-xs space-y-2.5 ${
            isDark ? 'bg-slate-800/70 border-slate-700/60' : 'bg-white/75 border-white'
          }`}>
            <div className={`font-semibold flex items-center gap-1.5 text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <span>🧑🏻‍💻</span>
              <span>GitHub 开源 3D 男生角色模型</span>
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              精选 GitHub 开源社区的高品质男生 3D 动漫手办资产，自带生动骨骼呼吸动作：
            </p>

            <div className="space-y-2 pt-1">
              {MODEL_PRESETS.map((preset) => {
                const isSelected = activeModelId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => onSelectModel(preset.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? isDark
                          ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-500/50'
                          : 'bg-sky-50/90 border-sky-300 ring-1 ring-sky-300 shadow-xs'
                        : isDark
                        ? 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                        : 'bg-slate-50/80 border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl mt-0.5">{preset.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                          {preset.name}
                        </span>
                        {preset.hasAnimations && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-medium">
                            自带骨骼动效
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {preset.desc}
                      </p>
                      <div className="text-[10px] mt-1 text-sky-500 font-mono">
                        {preset.source}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div
                onClick={() => onSelectModel('procedural')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  activeModelId === 'procedural'
                    ? isDark
                      ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500/50'
                      : 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300 shadow-xs'
                    : isDark
                    ? 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                    : 'bg-slate-50/80 border-slate-200/70 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mt-0.5">🧸</div>
                <div className="flex-1 min-w-0">
                  <span className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                    纯前端手作黏土小人
                  </span>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    无需网络模型加载，纯 Three.js 几何体与材质构建的二头身换装小人。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2 flex-wrap">
              <label className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium cursor-pointer transition inline-flex items-center gap-1.5 shadow-xs">
                <span>📁 加载本地自定义 .glb 模型</span>
                <input
                  id="input-glb-file"
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleModelChange}
                  className="hidden"
                />
              </label>
              <button
                id="btn-reset-model"
                type="button"
                onClick={onResetModel}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                重置为默认模型
              </button>
            </div>
          </div>

          {/* 2. Custom Voice Upload / Test */}
          <div className={`p-3.5 rounded-2xl border shadow-xs space-y-2 ${
            isDark ? 'bg-slate-800/70 border-slate-700/60' : 'bg-white/75 border-white'
          }`}>
            <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <span>🎙️</span>
              <span>弹窗 🔊 真人语音 / TTS 朗读设置</span>
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              你可以上传一段自己的真人语音介绍（<code>.mp3</code> / <code>.wav</code>）在当前页面直接试听；未上传时，点击弹窗右下角 🔊 会自动使用浏览器中文语音合成（TTS）朗读当前卡片文字。
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <label className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium cursor-pointer transition inline-flex items-center gap-1.5 shadow-xs">
                <span>上传真人录音试听</span>
                <input
                  id="input-voice-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleVoiceChange}
                  className="hidden"
                />
              </label>
              <button
                id="btn-clear-voice"
                type="button"
                onClick={onClearVoice}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                切回智能朗读
              </button>
            </div>
            {hasCustomVoice && customVoiceFileName && (
              <div id="custom-voice-status" className="text-[11px] text-emerald-400 font-medium">
                ✅ 已加载真人语音：{customVoiceFileName}（点击弹窗右下角 🔊 即可播放）
              </div>
            )}
          </div>

          {/* 3. Quick Profile Text Editor */}
          <div className={`p-3.5 rounded-2xl border shadow-xs space-y-3 ${
            isDark ? 'bg-slate-800/70 border-slate-700/60' : 'bg-white/75 border-white'
          }`}>
            <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <span>✏️</span>
              <span>快速修改我的昵称与简介（实时生效）</span>
            </div>
            <div>
              <label className={`block text-[11px] mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} htmlFor="input-profile-name">
                左上角展示昵称
              </label>
              <input
                id="input-profile-name"
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="例如：林星染 · Xingran"
                className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
                  isDark ? 'bg-slate-900/80 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} htmlFor="input-profile-about">
                “关于我”模块核心介绍词
              </label>
              <textarea
                id="input-profile-about"
                rows={3}
                value={inputAbout}
                onChange={(e) => setInputAbout(e.target.value)}
                placeholder="写一句最能代表你的介绍语..."
                className={`w-full px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
                  isDark ? 'bg-slate-900/80 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <button
              id="btn-save-profile"
              type="button"
              onClick={handleSubmit}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium transition cursor-pointer shadow-sm"
            >
              保存修改并存入浏览器缓存
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
