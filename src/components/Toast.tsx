import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div
      id="toast-msg"
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 glass-pill px-4 py-2 rounded-full text-xs font-medium text-slate-800 shadow-lg pointer-events-none transition-all duration-300 ${
        message ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      {message || '提示信息'}
    </div>
  );
};
