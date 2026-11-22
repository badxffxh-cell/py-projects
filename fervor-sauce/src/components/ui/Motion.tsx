import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { FlameIcon } from "./Icons";


export function FadeIn({
  children,
  className,
  delay = 0,
  y = 36,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "p" | "span";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </M>
  );
}

/** Animated number that counts up once it scrolls into view. */
export function Counter({
  to,
  from = 0,
  duration = 1.8,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [val, setVal] = useState(from);
  useEffect(() => {
    if (!inView) return;
    const c = animate(from, to, { duration, ease: EASE_OUT_EXPO, onUpdate: setVal });
    return () => c.stop();
  }, [inView, from, to, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(val)}
    </span>
  );
}

/** Five flames that ignite one after another. */
export function HeatMeter({
  heat,
  size = 18,
  className,
  activeClass = "text-flame",
  idleClass = "text-current opacity-25",
}: {
  heat: number;
  size?: number;
  className?: string;
  activeClass?: string;
  idleClass?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Heat ${heat} of 5`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <motion.span
          key={`${i}-${heat}`}
          initial={{ scale: 0.4, opacity: 0, y: 6 }}
          whileInView={{ scale: 1, opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 420, damping: 16 }}
          className={i < heat ? activeClass : idleClass}
        >
          <FlameIcon size={size} filled={i < heat} />
        </motion.span>
      ))}
    </span>
  );
}
