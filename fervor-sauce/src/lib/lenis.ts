"use client";

import type Lenis from "lenis";

let instance: Lenis | null = null;
let locks = 0;

export const setLenis = (l: Lenis | null) => {
  instance = l;
  if (l && locks > 0) l.stop();
};

export const getLenis = () => instance;

/** Smooth-scroll to a selector / element / offset, falling back to native. */
export function scrollToTarget(
  target: string | HTMLElement | number,
  opts: { offset?: number; duration?: number; immediate?: boolean } = {},
) {
  const lenis = instance;
  if (lenis) {
    lenis.scrollTo(target, {
      offset: opts.offset ?? 0,
      duration: opts.duration ?? 1.6,
      immediate: opts.immediate,
      easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target + (opts.offset ?? 0), behavior: "smooth" });
    return;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0);
    window.scrollTo({ top, behavior: "smooth" });
  }
}

/** Reference-counted scroll lock (drawer + menu can overlap). */
export const lockScroll = (locked: boolean) => {
  locks = Math.max(0, locks + (locked ? 1 : -1));
  const shouldLock = locks > 0;
  if (instance) {
    if (shouldLock) instance.stop();
    else instance.start();
  }
  document.documentElement.classList.toggle("scroll-locked", shouldLock);
};
