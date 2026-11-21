"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type CartLine, useCart, useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CheckIcon, PlusIcon } from "../ui/Icons";
import { EASE_OUT_EXPO } from "../ui/Motion";

type NewLine = Omit<CartLine, "key" | "qty">;

/** Adds to the cart, launches the fly-to-cart sprite and raises a toast. */
export function useAddToCart() {
  return useCallback(
    (line: NewLine, opts: { from?: Element | null; color: string; title: string; body?: string; qty?: number }) => {
      useCart.getState().add(line, opts.qty ?? 1);
      const ui = useUI.getState();
      if (opts.from) {
        const r = opts.from.getBoundingClientRect();
        ui.launchFlight({ x: r.left + r.width / 2, y: r.top + r.height / 2, color: opts.color });
      } else ui.bumpCart();
      ui.pushToast({ title: opts.title, body: opts.body, color: opts.color });
    },
    [],
  );
}

interface AddToCartButtonProps {
  line: NewLine;
  color: string;
  title: string;
  body?: string;
  qty?: number;
  label?: string;
  price?: string;
  className?: string;
  tone?: "flame" | "ink" | "cream";
  compact?: boolean;
}

/** Pill that morphs: "Add to cart — $14" → spinner sweep → "Added ✓". */
export function AddToCartButton({
  line,
  color,
  title,
  body,
  qty,
  label = "Add to cart",
  price,
  className,
  tone = "flame",
  compact,
}: AddToCartButtonProps) {
  const add = useAddToCart();
  const ref = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<"idle" | "added">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = () => {
    add(line, { from: ref.current, color, title, body, qty });
    setState("added");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1700);
  };

  const tones = {
    flame: "bg-flame text-ink hover:bg-cream",
    ink: "bg-ink text-cream hover:bg-flame hover:text-ink",
    cream: "bg-cream text-ink hover:bg-flame",
  };

  if (compact) {
    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.88 }}
        data-cursor="Add"
        aria-label={`${label}: ${title}`}
        className={cn(
          "relative grid size-12 place-items-center overflow-hidden rounded-full transition-colors duration-300",
          tones[tone],
          className,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            initial={{ y: 22, rotate: -45, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -22, rotate: 45, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {state === "added" ? <CheckIcon /> : <PlusIcon />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      data-cursor="Add"
      className={cn(
        "group relative flex h-16 w-full items-center justify-between overflow-hidden rounded-full pl-8 pr-2.5 text-left font-medium uppercase tracking-[0.14em] transition-colors duration-300",
        tones[tone],
        className,
      )}
    >
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-cream/25"
        initial={false}
        animate={{ width: state === "added" ? "100%" : "0%", opacity: state === "added" ? [1, 0] : 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
      />
      <span className="relative h-5 overflow-hidden text-[13px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            className="flex items-center gap-2"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "-110%" }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            {state === "added" ? (
              <>
                <CheckIcon size={16} /> Added to cart
              </>
            ) : (
              label
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="relative flex items-center gap-3">
        {price && <span className="font-mono text-sm tracking-normal tabular-nums">{price}</span>}
        <span className="grid size-11 place-items-center rounded-full bg-ink text-cream transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:rotate-90">
          <PlusIcon />
        </span>
      </span>
    </motion.button>
  );
}
