import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { drag, jarRect } from "@/lib/sceneState";
import { cn } from "@/lib/utils";

/**
 * Two-part cursor: a precise dot plus a lagging ring that swells over
 * interactive elements and shows a contextual label ("Drag", "View", …)
 * read from the nearest [data-cursor] or from the jar's screen bounds.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => {
      setEnabled(mq.matches);
      document.documentElement.classList.toggle("has-cursor", mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let lastLabel: string | null = null;
    let lastHover = false;
    const resolve = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      const tagged = el?.closest<HTMLElement>("[data-cursor]");
      let l: string | null = tagged?.dataset.cursor || null;
      const interactive = !!el?.closest("a,button,input,select,textarea,label,[role='button']");
      if (!l && !interactive) {
        const inJar =
          jarRect.draggable === 1 &&
          e.clientX >= jarRect.x - 24 &&
          e.clientX <= jarRect.x + jarRect.w + 24 &&
          e.clientY >= jarRect.y &&
          e.clientY <= jarRect.y + jarRect.h;
        if (inJar || drag.active) l = drag.active ? "Spin" : "Drag";
      }
      if (l !== lastLabel) setLabel((lastLabel = l));
      const h = interactive || !!l;
      if (h !== lastHover) setHover((lastHover = h));
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      resolve(e);
    };
    const leave = () => setVisible(false);
    const pd = () => setDown(true);
    const pu = () => setDown(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size = label ? 88 : hover ? 54 : 34;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: rx, y: ry }}
        animate={{ opacity: visible ? 1 : 0 }}
      >
        <motion.div
          className={cn(
            "grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full",
            label ? "bg-flame text-ink" : "ring-1 ring-cream/50 backdrop-invert-[0.04]",
          )}
          animate={{ width: size, height: size, scale: down ? 0.86 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <AnimatePresence mode="wait">
            {label && (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18 }}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.2em]"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      <motion.div className="absolute left-0 top-0" style={{ x, y }} animate={{ opacity: visible && !label ? 1 : 0 }}>
        <div className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-flame" />
      </motion.div>
    </div>
  );
}
