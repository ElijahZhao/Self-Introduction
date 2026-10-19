import React, { useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface LoadingScreenProps {
  progress: number; // 0 to 100
  statusText: string;
  themeMode: ThemeMode;
  isComplete: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  statusText,
  themeMode,
  isComplete,
}) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [displayPercent, setDisplayPercent] = useState(progress);

  // Smooth number interpolation for percent
  useEffect(() => {
    const target = Math.min(100, Math.max(0, Math.round(progress)));
    const interval = setInterval(() => {
      setDisplayPercent((prev) => {
        if (prev < target) {
          return Math.min(target, prev + Math.ceil((target - prev) * 0.25) || prev + 1);
        }
        return target;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [progress]);

  // Handle smooth fade out exit
  useEffect(() => {
    if (isComplete && displayPercent >= 100) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [isComplete, displayPercent]);

  if (!shouldRender) return null;

  const isDark = themeMode === 'dark';
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(100, displayPercent) / 100);

  return (
    <div
      id="3d-loading-screen"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ${
        isComplete ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto scale-100'
      }`}
      style={{
        background: isDark
          ? 'radial-gradient(circle at 50% 45%, rgba(15, 23, 42, 0.88) 0%, rgba(6, 10, 20, 0.95) 100%)'
          : 'radial-gradient(circle at 50% 45%, rgba(248, 250, 252, 0.82) 0%, rgba(226, 232, 240, 0.92) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      aria-label="3D 资产加载进度"
      role="progressbar"
      aria-valuenow={displayPercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Central Glassmorphism Card */}
      <div
        className={`glass-modal rounded-[32px] p-8 sm:p-10 flex flex-col items-center max-w-[380px] w-full text-center relative overflow-hidden shadow-2xl transition-all duration-300 border ${
          isDark
            ? 'bg-slate-900/75 border-white/15 shadow-black/60'
            : 'bg-white/80 border-white/90 shadow-sky-900/10'
        }`}
      >
        {/* Soft Decorative Ambient Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors"
          style={{
            background: isDark
              ? 'radial-gradient(circle, #6366f1 0%, transparent 70%)'
              : 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
          }}
        />

        {/* Circular Progress SVG */}
        <div className="relative w-36 h-36 flex items-center justify-center my-2">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="60%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              strokeWidth="7"
              className={isDark ? 'stroke-slate-800' : 'stroke-slate-200/80'}
            />

            {/* Glowing Progress Arc */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#glow)"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>

          {/* Center Emoji & Numeric Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl animate-bounce mb-0.5">🧑🏻‍💻</span>
            <span
              className={`text-2xl font-black tracking-tight font-mono ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}
            >
              {displayPercent}%
            </span>
          </div>
        </div>

        {/* Loading Titles & Detail */}
        <div className="mt-4 space-y-1.5 z-10 w-full">
          <h3
            className={`font-bold text-base tracking-tight ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
          >
            赵玉林 · 3D 个人展台
          </h3>
          <p
            className={`text-xs font-medium ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            正在构筑三维星轨空间与角色模型
          </p>

          {/* Dynamic Status Text */}
          <div
            className={`mt-3 py-1.5 px-3 rounded-full text-[11px] font-mono truncate transition-all ${
              isDark
                ? 'bg-slate-800/80 text-sky-400 border border-slate-700/60'
                : 'bg-sky-50/80 text-sky-700 border border-sky-100'
            }`}
          >
            {statusText || '正在载入 3D 资产...'}
          </div>
        </div>

        {/* Bottom subtle pulsing dots */}
        <div className="flex items-center gap-1.5 mt-5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
