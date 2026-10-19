import React from 'react';
import { ScreenCoord } from '../types';

interface FloatingWaveBadgeProps {
  coords: ScreenCoord | null;
}

export const FloatingWaveBadge: React.FC<FloatingWaveBadgeProps> = ({ coords }) => {
  const active = Boolean(coords);

  return (
    <div
      id="floating-wave-badge"
      className={`glass-pill px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md wave-animating ${
        active ? 'active' : ''
      }`}
      style={
        coords
          ? {
              left: `${coords.x}px`,
              top: `${coords.y - 18}px`,
            }
          : undefined
      }
    >
      <span className="wave-bar h-2" />
      <span className="wave-bar h-3.5" />
      <span className="wave-bar h-2.5" />
      <span className="wave-bar h-1.5" />
      <span className="wave-bar h-4" />
      <span className="wave-bar h-2.5" />
      <span className="wave-bar h-1.5" />
      <span className="wave-bar h-3.5" />
      <span className="wave-bar h-2" />
    </div>
  );
};
