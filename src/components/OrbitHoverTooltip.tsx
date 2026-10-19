import React from 'react';
import { ScreenCoord } from '../types';

interface OrbitHoverTooltipProps {
  hoverData: {
    emoji: string;
    label: string;
    coords: ScreenCoord;
  } | null;
}

export const OrbitHoverTooltip: React.FC<OrbitHoverTooltipProps> = ({ hoverData }) => {
  const visible = Boolean(hoverData);

  return (
    <div
      id="orbit-hover-tooltip"
      className={`glass-pill px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-sm ${
        visible ? 'visible' : ''
      }`}
      style={
        hoverData
          ? {
              left: `${hoverData.coords.x}px`,
              top: `${hoverData.coords.y}px`,
            }
          : undefined
      }
    >
      <span id="tooltip-emoji">{hoverData?.emoji || '🪐'}</span>
      <span id="tooltip-title">{hoverData?.label || '关于我'}</span>
      <span className="text-[10px] text-slate-400">点击探索</span>
    </div>
  );
};
