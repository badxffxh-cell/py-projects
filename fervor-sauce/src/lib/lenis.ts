import type Lenis from "lenis";

let instance: Lenis | null = null;
/** Who is currently holding the page still (preloader, cart, menu, jar spin). */
const owners = new Set<string>();

export const setLenis = (l: Lenis | null) => {
  instance = l;
  if (l && owners.size > 0) l.stop();
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

/**
 * Named scroll locks. Each owner either holds the page or not, so locking or
 * unlocking twice is harmless — React StrictMode runs effects twice in
 * development, and a plain counter used to leave the page frozen there.
 */
export const lockScroll = (owner: string, locked: boolean) => {
  if (locked) owners.add(owner);
  else owners.delete(owner);
  const shouldLock = owners.size > 0;
  if (instance) {
    if (shouldLock) instance.stop();
    else instance.start();
  }
  document.documentElement.classList.toggle("scroll-locked", shouldLock);
};
