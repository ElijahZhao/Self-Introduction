import React from 'react';
import { useLang } from '../i18n';

export type StageFailureReason = 'unsupported' | 'context-lost' | 'assets' | 'crash';

interface StageFallbackProps {
  reason: StageFailureReason;
  onRetry?: () => void;
  onViewText: () => void;
}

/**
 * Readable stand-in for the 3D stage when it cannot run.
 *
 * Before this existed, a missing WebGL2 context left the visitor staring at the
 * loading overlay forever (progress stuck at 15%) with nothing to click. The
 * card sits below the header and above the dock so every other entry point
 * (About / Projects / Skills / Contact) keeps working.
 */
export const StageFallback: React.FC<StageFallbackProps> = ({ reason, onRetry, onViewText }) => {
  const { pick } = useLang();

  const copy = {
    unsupported: {
      title: pick('当前浏览器未启用 WebGL2', 'WebGL2 is unavailable'),
      desc: pick(
        '3D 展台需要 WebGL2 才能渲染。你的浏览器或显卡驱动没有提供该能力，这里已切换为文字模式，个人介绍、项目与联系方式仍然完整可用。',
        'The 3D stage needs WebGL2 to render. Your browser or GPU driver did not provide it, so the stage switched to a text-only mode — profile, projects and contact stay fully accessible.'
      ),
      hint: pick(
        '建议在 Chrome / Edge / Safari 中开启硬件加速后重新加载。',
        'Try enabling hardware acceleration in Chrome / Edge / Safari, then reload.'
      ),
    },
    'context-lost': {
      title: pick('3D 展台已暂停', 'The 3D stage is paused'),
      desc: pick(
        '显卡上下文丢失，常见于切换独立显卡、系统休眠唤醒或显存不足。展台已安全退出，其余内容不受影响。',
        'The GPU context was lost — usually after switching GPUs, waking from sleep, or running out of video memory. The stage exited safely; everything else is intact.'
      ),
      hint: pick('重新加载展台即可恢复。', 'Reloading the stage restores it.'),
    },
    assets: {
      title: pick('3D 角色资源未能加载', 'The 3D character failed to load'),
      desc: pick(
        '主角模型没有取到（可能被网络拦截、CDN 不可达或部署产物缺失）。展台已降级为文字模式，所有介绍、项目与联系方式仍可正常浏览。',
        'The protagonist model could not be fetched — blocked network, unreachable CDN, or a missing deploy artifact. The stage degraded to text mode; profile, projects and contact remain available.'
      ),
      hint: pick('检查网络后点击「重新加载展台」即可恢复。', 'Check your network, then reload the stage.'),
    },
    crash: {
      title: pick('3D 展台遇到异常', 'The 3D stage hit an error'),
      desc: pick(
        '渲染过程抛出了未预期的错误，已为你降级到文字模式，避免整页白屏。',
        'The renderer threw an unexpected error. We degraded to text mode instead of leaving a blank page.'
      ),
      hint: pick('可以尝试重新加载；若反复出现，请把浏览器版本反馈给我。', 'Try reloading — if it keeps happening, tell me your browser version.'),
    },
  }[reason];

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center px-5 pb-32 pt-24 pointer-events-none">
      <div className="glass-modal rounded-[26px] p-6 sm:p-7 w-full max-w-[420px] pointer-events-auto">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl" aria-hidden="true">🛰️</span>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">{copy.title}</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{copy.desc}</p>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-3">{copy.hint}</p>
        <div className="flex flex-wrap gap-2.5 mt-5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-full text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            >
              {pick('重新加载展台', 'Reload the stage')}
            </button>
          )}
          <button
            type="button"
            onClick={onViewText}
            className="px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors dark:bg-slate-700/70 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {pick('查看文字介绍', 'Read the text version')}
          </button>
        </div>
      </div>
    </div>
  );
};
