"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { lockScroll } from "@/lib/lenis";
import {
  BUNDLE,
  FLAVORS,
  FREE_SHIPPING_THRESHOLD,
  SIZES,
  formatPrice,
  getFlavor,
} from "@/lib/products";
import { cartCount, cartSubtotal, linePrice, useCart, useUI, type CartLine } from "@/lib/store";
import { CloseIcon, FlameIcon, MinusIcon, PlusIcon } from "../ui/Icons";
import { JarIllustration } from "../ui/JarIllustration";
import { EASE_OUT_EXPO } from "../ui/Motion";
import { useAddToCart } from "./AddToCart";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const setOpen = useUI((s) => s.setCartOpen);
  const lines = useCart((s) => s.lines);
  const panel = useRef<HTMLDivElement>(null);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);
  const hasBundle = lines.some((l) => l.kind === "bundle");
  const add = useAddToCart();
  const pushToast = useUI((s) => s.pushToast);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("button")?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("button, a[href], input");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[70] bg-ink/70 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            key="panel"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[480px] flex-col bg-coal text-cream shadow-[-30px_0_80px_-20px_rgb(0_0_0/0.7)] sm:inset-y-2 sm:right-2 sm:rounded-3xl sm:ring-1 sm:ring-cream/10"
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <header className="flex items-center justify-between px-6 pb-4 pt-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash">Your batch</p>
                <h2 className="font-display text-4xl uppercase leading-none">
                  Cart <span className="text-flame">({count})</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="grid size-11 place-items-center rounded-full ring-1 ring-inset ring-cream/15 transition hover:rotate-90 hover:bg-cream hover:text-ink"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="px-6 pb-4">
              <p className="mb-2 text-xs text-cream/70">
                {remaining > 0 ? (
                  <>
                    You&apos;re <span className="text-flame">{formatPrice(remaining)}</span> away from free shipping
                  </>
                ) : (
                  <>Free shipping unlocked — your sauce travels on us.</>
                )}
              </p>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-cream/10">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ember to-amber"
                  initial={false}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
                />
              </div>
            </div>

            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-6">
              {lines.length === 0 ? (
                <EmptyCart onClose={() => setOpen(false)} />
              ) : (
                <ul className="divide-y divide-cream/10">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <LineItem key={l.key} line={l} />
                    ))}
                  </AnimatePresence>
                </ul>
              )}

              {lines.length > 0 && !hasBundle && (
                <motion.div
                  layout
                  className="my-5 flex items-center gap-4 rounded-2xl bg-char p-4 ring-1 ring-cream/10"
                >
                  <div className="flex -space-x-5">
                    {FLAVORS.map((f) => (
                      <JarIllustration key={f.id} flavor={f} detailed={false} className="h-14 w-auto" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{BUNDLE.name}</p>
                    <p className="text-xs text-cream/60">
                      All four · <span className="line-through">{formatPrice(BUNDLE.compareAt)}</span>{" "}
                      <span className="text-flame">{formatPrice(BUNDLE.price)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) =>
                      add(
                        { kind: "bundle" },
                        { from: e.currentTarget, color: "#ff5b1f", title: `${BUNDLE.name} added`, body: "All four sauces" },
                      )
                    }
                    className="rounded-full bg-cream px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-flame"
                  >
                    Add
                  </button>
                </motion.div>
              )}
            </div>

            <footer className="border-t border-cream/10 px-6 pb-6 pt-5">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-ash">Subtotal</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={subtotal}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    className="font-display text-3xl tabular-nums"
                  >
                    {formatPrice(subtotal)}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="mb-4 text-xs text-cream/50">Taxes and shipping calculated at checkout.</p>
              <button
                type="button"
                disabled={!lines.length}
                onClick={() =>
                  pushToast({
                    title: "Checkout is a demo",
                    body: "This concept store doesn’t take payments.",
                  })
                }
                className="group flex h-16 w-full items-center justify-between rounded-full bg-flame pl-8 pr-2.5 font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:bg-cream disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="text-[13px]">Checkout</span>
                <span className="grid size-11 place-items-center rounded-full bg-ink text-cream transition-transform duration-500 group-hover:translate-x-0.5">
                  <FlameIcon size={18} />
                </span>
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex -space-x-6 opacity-90">
        {FLAVORS.slice(0, 3).map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ y: 30, opacity: 0, rotate: (i - 1) * 8 }}
            animate={{ y: 0, opacity: 1, rotate: (i - 1) * 8 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.8, ease: EASE_OUT_EXPO }}
          >
            <JarIllustration flavor={f} className="h-28 w-auto" />
          </motion.div>
        ))}
      </div>
      <p className="font-serif text-3xl italic">Your cart is cold.</p>
      <p className="max-w-[26ch] text-sm text-cream/60">Warm it up with a jar or two — every order ships within 48 hours.</p>
      <a
        href="#shop"
        onClick={onClose}
        className="rounded-full bg-cream px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink transition hover:bg-flame"
      >
        Shop the batch
      </a>
    </div>
  );
}

function LineItem({ line }: { line: CartLine }) {
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const isBundle = line.kind === "bundle";
  const flavor = getFlavor(line.flavorId ?? "ember");
  const size = SIZES.find((s) => s.id === line.size);
  const price = linePrice(line);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className="flex gap-4 overflow-hidden py-5"
    >
      <div className="grid h-24 w-20 shrink-0 place-items-center rounded-2xl bg-char ring-1 ring-cream/10">
        {isBundle ? (
          <div className="flex -space-x-7">
            {FLAVORS.slice(0, 3).map((f) => (
              <JarIllustration key={f.id} flavor={f} detailed={false} className="h-14 w-auto" />
            ))}
          </div>
        ) : (
          <JarIllustration flavor={flavor} detailed={false} className="h-20 w-auto" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl uppercase leading-tight">{isBundle ? BUNDLE.name : flavor.name}</p>
            <p className="truncate text-xs text-cream/60">
              {isBundle
                ? BUNDLE.descriptor
                : `${size?.label ?? "8 oz"} · ${line.subscribe ? "Every 6 weeks · −15%" : "One-time"}`}
            </p>
          </div>
          <p className="font-mono text-sm tabular-nums">{formatPrice(price * line.qty)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center rounded-full ring-1 ring-inset ring-cream/15">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty(line.key, line.qty - 1)}
              className="grid size-9 place-items-center rounded-full transition hover:bg-cream/10"
            >
              <MinusIcon size={14} />
            </button>
            <span className="relative w-7 overflow-hidden text-center font-mono text-sm tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={line.qty}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="block"
                >
                  {line.qty}
                </motion.span>
              </AnimatePresence>
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty(line.key, line.qty + 1)}
              className="grid size-9 place-items-center rounded-full transition hover:bg-cream/10"
            >
              <PlusIcon size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(line.key)}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream/50 underline-offset-4 transition hover:text-flame hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </motion.li>
  );
}
