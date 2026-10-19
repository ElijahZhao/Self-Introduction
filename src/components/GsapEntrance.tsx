import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

interface GsapEntranceProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds before the animation starts. */
  delay?: number;
  /** Vertical offset applied at start, in pixels. */
  y?: number;
  /** Duration in seconds. */
  duration?: number;
  /** Optional stagger target — when set, animates direct children one by one. */
  stagger?: number;
}

/**
 * Lightweight GSAP entrance animation wrapper.
 * Fades + slides its content in on mount. When `stagger` is provided,
 * it animates each direct child sequentially.
 */
export const GsapEntrance: React.FC<GsapEntranceProps> = ({
  children,
  className = '',
  delay = 0,
  y = 14,
  duration = 0.7,
  stagger,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets: gsap.TweenTarget = stagger ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        autoAlpha: 0,
        y,
        duration,
        delay,
        ease: 'power3.out',
        stagger: stagger ?? 0,
        clearProps: 'transform',
      });
    }, el);

    return () => ctx.revert();
  }, [delay, duration, stagger, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
