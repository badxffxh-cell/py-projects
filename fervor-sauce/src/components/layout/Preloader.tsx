import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { lockScroll } from "@/lib/lenis";
import { intro } from "@/lib/sceneState";
import { useUI } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/utils";
import { FlameIcon } from "../ui/Icons";
import { EASE_OUT_EXPO } from "@/lib/motion";

const STEPS = ["Sourcing chiles", "Charring over oak", "Fermenting 30 days", "Hand-numbering jars"];

/**
 * Counts to 100 while the WebGL scene builds its textures, holds near the
 * end until the jar is genuinely ready, then wipes away in two layers
 * (orange, then ink) and hands off to the hero intro.
 */
export function Preloader() {
  const sceneReady = useUI((s) => s.sceneReady);
  const webgl = useUI((s) => s.webgl);
  const setIntroDone = useUI((s) => s.setIntroDone);
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const progress = useRef({ v: 0 });
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = sceneReady || webgl === false;
  }, [sceneReady, webgl]);

  useEffect(() => {
    lockScroll("preloader", true);
    const reduce = prefersReducedMotion();
    const start = performance.now();
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setCount(100);
      window.setTimeout(() => setVisible(false), reduce ? 50 : 420);
    };

    let last = start;
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const ready = readyRef.current || elapsed > 9;
      // Ease toward 92% on our own; the last stretch waits for the scene.
      const target = ready ? 100 : 92 * (1 - Math.exp(-elapsed * 1.15));
      // Time-based easing so slow frames (heavy GPU warm-up) don't stall the count.
      progress.current.v += (target - progress.current.v) * (1 - Math.exp(-dt * (ready ? 9 : 5)));
      const v = Math.round(progress.current.v);
      setCount((c) => (c === v ? c : v));
      if (ready && progress.current.v > 99.4 && elapsed > (reduce ? 0.1 : 1.6)) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // balanced with the lock above (StrictMode mounts effects twice in dev)
      lockScroll("preloader", false);
    };
  }, []);

  const onExitComplete = () => {
    lockScroll("preloader", false);
    setIntroDone();
  };

  // Start the 3D intro slightly before the curtain finishes for overlap.
  useEffect(() => {
    if (visible) return;
    const reduce = prefersReducedMotion();
    gsap.to(intro, { jar: 1, duration: reduce ? 0.01 : 2.2, ease: "expo.out", delay: reduce ? 0 : 0.35 });
    gsap.to(intro, { reveal: 1, duration: reduce ? 0.01 : 1.8, ease: "expo.out", delay: reduce ? 0 : 0.55 });
  }, [visible]);

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((count / 100) * STEPS.length))];

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[80]"
          exit={{ pointerEvents: "none" }}
          transition={{ duration: 1.3 }}
          aria-live="polite"
          aria-label="Loading"
        >
          <motion.div
            className="absolute inset-0 bg-flame"
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            initial={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: 0.18 }}
          />
          <motion.div
            className="absolute inset-0 flex flex-col justify-between bg-ink p-5 tex-charcoal md:p-8"
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            initial={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-ash">
              <span>Fervor — Sauce atelier</span>
              <span className="hidden sm:inline">Batch Nº 027</span>
            </div>

            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 2, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="text-flame"
              >
                <FlameIcon size={44} />
              </motion.div>
              <div className="overflow-hidden">
                <motion.p
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, ease: EASE_OUT_EXPO }}
                  className="font-display text-[clamp(3.5rem,12vw,10rem)] leading-[0.85] tracking-tight text-cream"
                >
                  FERVOR
                </motion.p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-6">
              <div className="h-5 overflow-hidden font-mono text-[11px] uppercase tracking-[0.3em] text-ash">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={step}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                    className="block"
                  >
                    {step}…
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.8] text-flame tabular-nums">
                {String(count).padStart(3, "0")}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-flame" style={{ transform: `scaleX(${count / 100})` }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
