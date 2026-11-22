import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "flame" | "cream" | "ghost" | "ink" | "outline-ink";

const variants: Record<Variant, { base: string; fill: string; hover: string }> = {
  flame: { base: "bg-flame text-ink", fill: "bg-cream", hover: "group-hover:text-ink" },
  cream: { base: "bg-cream text-ink", fill: "bg-flame", hover: "group-hover:text-ink" },
  ghost: {
    base: "bg-transparent text-cream ring-1 ring-inset ring-cream/30",
    fill: "bg-cream",
    hover: "group-hover:text-ink",
  },
  ink: { base: "bg-ink text-cream", fill: "bg-flame", hover: "group-hover:text-ink" },
  "outline-ink": {
    base: "bg-transparent text-ink ring-1 ring-inset ring-ink/40",
    fill: "bg-ink",
    hover: "group-hover:text-cream",
  },
};

interface MagneticProps {
  children: ReactNode;
  variant?: Variant;
  size?: "md" | "lg";
  href?: string;
  strength?: number;
  icon?: ReactNode;
  className?: string;
  wrapperClassName?: string;
  cursor?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Pill button that leans toward the cursor (spring physics), with a liquid
 * fill that grows from the pointer's entry point and a vertical text roll.
 */
export function MagneticButton({
  children,
  variant = "flame",
  size = "md",
  href,
  strength = 0.35,
  icon,
  className,
  wrapperClassName,
  cursor,
  type = "button",
  disabled,
  ariaLabel,
  onClick,
}: MagneticProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });
  const ix = useTransform(sx, (v) => v * 0.45);
  const iy = useTransform(sy, (v) => v * 0.45);
  const v = variants[variant];

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onEnter = (e: React.PointerEvent) => {
    if (!wrap.current || !fill.current) return;
    const r = wrap.current.getBoundingClientRect();
    fill.current.style.left = `${e.clientX - r.left}px`;
    fill.current.style.top = `${e.clientY - r.top}px`;
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const inner = (
    <>
      <span
        ref={fill}
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[260%] -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-100",
          v.fill,
        )}
      />
      <motion.span style={{ x: ix, y: iy }} className="relative flex items-center gap-3">
        <span className="relative block overflow-hidden">
          <span className="block transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-full">
            {children}
          </span>
          <span
            aria-hidden
            className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0"
          >
            {children}
          </span>
        </span>
        {icon && (
          <span className="grid place-items-center transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1">
            {icon}
          </span>
        )}
      </motion.span>
    </>
  );

  const cls = cn(
    "group relative isolate inline-flex items-center justify-center overflow-hidden rounded-full font-medium uppercase tracking-[0.14em] transition-colors duration-300 disabled:opacity-50",
    size === "lg" ? "h-16 px-9 text-[13px] sm:text-sm" : "h-12 px-7 text-[12px]",
    v.base,
    v.hover,
    className,
  );

  return (
    <motion.div
      ref={wrap}
      style={{ x: sx, y: sy }}
      className={wrapperClassName ?? "inline-block"}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
    >
      {href ? (
        <a href={href} className={cls} data-cursor={cursor} aria-label={ariaLabel} onClick={onClick}>
          {inner}
        </a>
      ) : (
        <button
          type={type}
          className={cls}
          data-cursor={cursor}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={onClick}
        >
          {inner}
        </button>
      )}
    </motion.div>
  );
}
