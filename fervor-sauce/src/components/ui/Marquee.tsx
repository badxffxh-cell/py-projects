"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { scroll } from "@/lib/sceneState";
import { cn, prefersReducedMotion } from "@/lib/utils";

/**
 * Infinite marquee on GSAP's ticker. Scrolling speeds it up, scrolling
 * back up flips its direction, and an optional skew sells the momentum.
 */
export function Marquee({
  children,
  speed = 60,
  reverse = false,
  skew = false,
  className,
  trackClassName,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  skew?: boolean;
  className?: string;
  trackClassName?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let half = el.scrollWidth / 2;
    const ro = new ResizeObserver(() => (half = el.scrollWidth / 2));
    ro.observe(el);
    const reduce = prefersReducedMotion();
    let x = 0;
    let dir = 1;
    let sk = 0;
    const tick = (_t: number, dtMs: number) => {
      const dt = Math.min(dtMs, 64) / 1000;
      const v = scroll.velocity;
      if (Math.abs(v) > 0.6) dir = v > 0 ? 1 : -1;
      const boost = 1 + Math.min(5, Math.abs(v) * 0.09);
      x -= (reduce ? 0.25 : 1) * speed * boost * dir * (reverse ? -1 : 1) * dt;
      if (half > 0) {
        if (x <= -half) x += half;
        if (x > 0) x -= half;
      }
      sk += ((skew ? Math.max(-8, Math.min(8, -v * 0.25)) : 0) - sk) * 0.12;
      el.style.transform = `translate3d(${x}px,0,0) skewX(${sk.toFixed(2)}deg)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, [speed, reverse, skew]);

  return (
    <div className={cn("overflow-hidden", className)}>
      <div ref={track} className={cn("flex w-max will-change-transform", trackClassName)}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
