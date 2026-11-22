import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { setLenis } from "@/lib/lenis";
import { drag, pointer, scroll } from "@/lib/sceneState";
import { useCart } from "@/lib/store";

/**
 * Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger, Lenis and
 * every scrubbed animation advance on exactly the same frame. Also feeds the
 * pointer + scroll velocity into the shared scene state.
 */
export function SmoothScroll() {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.95,
      // Phones and tablets get the same buttery, inertial scroll as desktop:
      // Lenis drives touch scrolling itself instead of handing it to the OS.
      syncTouch: true,
      syncTouchLerp: 0.085,
      touchInertiaExponent: 1.75,
      touchMultiplier: 1.15,
      anchors: { offset: 0, duration: 1.6 },
      stopInertiaOnNavigate: true,
    });
    setLenis(lenis);

    const onScroll = (l: Lenis) => {
      scroll.y = l.scroll;
      scroll.velocity = l.velocity;
      ScrollTrigger.update();
    };
    lenis.on("scroll", onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Velocity decays to zero once scrolling stops (Lenis stops emitting).
    const decay = () => {
      if (!lenis.isScrolling) scroll.velocity *= 0.9;
    };
    gsap.ticker.add(decay);

    const onPointer = (e: PointerEvent) => {
      pointer.px = e.clientX;
      pointer.py = e.clientY;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.moved = true;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // Layout shifts once webfonts land; re-measure every trigger.
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && ScrollTrigger.refresh());
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    // Restore the persisted cart after hydration (avoids SSR mismatch).
    useCart.persist.rehydrate();

    return () => {
      cancelled = true;
      drag.active = false;
      gsap.ticker.remove(tick);
      gsap.ticker.remove(decay);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("load", onLoad);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
