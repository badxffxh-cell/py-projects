"use client";

import { useId, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  FLAVORS,
  SIZES,
  SUBSCRIBE_DISCOUNT,
  type SizeId,
  formatPrice,
  getFlavor,
  unitPrice,
} from "@/lib/products";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "../cart/AddToCart";
import { MinusIcon, PlusIcon, RotateIcon, StarIcon } from "../ui/Icons";
import { EASE_OUT_EXPO, FadeIn, HeatMeter } from "../ui/Motion";

/**
 * Product configurator. The 3D jar on the left follows the selected flavour
 * (wired in ScrollChoreography) and can be grabbed and spun.
 */
export function Shop() {
  const shopFlavor = useUI((s) => s.shopFlavor);
  const setShopFlavor = useUI((s) => s.setShopFlavor);
  const [size, setSize] = useState<SizeId>("8oz");
  const [subscribe, setSubscribe] = useState(false);
  const [qty, setQty] = useState(1);
  const flavor = getFlavor(shopFlavor);
  const price = unitPrice(flavor, size, subscribe);
  const sizeLabel = SIZES.find((s) => s.id === size)?.label ?? "";

  return (
    <section id="shop" className="relative min-h-svh" aria-labelledby="shop-title">
      <div aria-hidden className="absolute inset-0 z-0 tex-charcoal">
        <div className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(40%_50%_at_25%_50%,rgb(255_91_31/0.14),transparent_70%)] md:w-1/2" />
      </div>

      <div className="relative z-20 mx-auto grid max-w-[1600px] gap-10 px-5 pb-24 pt-[54svh] md:min-h-svh md:grid-cols-2 md:px-8 md:pb-28 md:pt-32">
        <div className="pointer-events-none hidden flex-col justify-between md:flex">
          <FadeIn>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-flame">(Shop the batch)</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-ash">
              Batch Nº {flavor.batch} · hand-numbered
            </p>
          </FadeIn>
          <FadeIn className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/60">
            <span className="grid size-10 place-items-center rounded-full ring-1 ring-cream/25">
              <RotateIcon />
            </span>
            Drag the jar to spin it
          </FadeIn>
        </div>

        <div className="md:pl-6 lg:pl-16">
          <div className="flex items-center gap-2 text-flame">
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon key={i} />
            ))}
            <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.25em] text-cream/60">
              4.9 · 2,314 reviews
            </span>
          </div>

          <div className="relative mt-4 h-[clamp(4rem,8.5vw,8.5rem)] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h2
                id="shop-title"
                key={flavor.id}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                className="font-display text-[clamp(4rem,8.5vw,8.5rem)] uppercase leading-[0.95]"
              >
                {flavor.name}
              </motion.h2>
            </AnimatePresence>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-b border-cream/10 pb-6">
            <p className="font-serif text-2xl italic text-cream/80">{flavor.descriptor}</p>
            <HeatMeter heat={flavor.heat} size={18} />
          </div>

          <div className="mt-6 flex items-end justify-between gap-6">
            <div className="relative h-16 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={price}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                  className="font-display text-6xl leading-none tabular-nums"
                >
                  {formatPrice(price)}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="pb-1 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ash">
              {sizeLabel}
              {subscribe && (
                <>
                  <br />
                  <span className="text-flame">−{SUBSCRIBE_DISCOUNT * 100}% subscribed</span>
                </>
              )}
            </p>
          </div>

          <Fieldset legend="Flavor" value={flavor.name}>
            <LayoutGroup id="swatch">
              <div className="flex flex-wrap gap-3">
                {FLAVORS.map((f) => {
                  const active = f.id === flavor.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setShopFlavor(f.id)}
                      aria-pressed={active}
                      aria-label={f.name}
                      data-cursor={f.name}
                      className="group relative grid size-14 place-items-center rounded-full"
                    >
                      {active && (
                        <motion.span
                          layoutId="swatch-ring"
                          className="absolute inset-0 rounded-full ring-2 ring-flame"
                          transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        />
                      )}
                      <span
                        className="size-10 rounded-full ring-1 ring-cream/25 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-110"
                        style={{
                          background: `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.55), transparent 32%), conic-gradient(from 210deg, ${f.colors.sauce}, ${f.colors.sauceDeep}, ${f.colors.sauce})`,
                          boxShadow: `inset 0 -6px 12px ${f.colors.sauceDeep}`,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </Fieldset>

          <Fieldset legend="Size" value={SIZES.find((s) => s.id === size)?.sub ?? ""}>
            <LayoutGroup id="size">
              <div className="grid grid-cols-3 gap-2 rounded-full bg-char p-1.5 ring-1 ring-inset ring-cream/10">
                {SIZES.map((s) => {
                  const active = s.id === size;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.id)}
                      aria-pressed={active}
                      className={cn(
                        "relative rounded-full px-2 py-3 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors",
                        active ? "text-ink" : "text-cream/70 hover:text-cream",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="size-pill"
                          className="absolute inset-0 rounded-full bg-cream"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </Fieldset>

          <Fieldset legend="Purchase">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { sub: false, title: "One-time", note: "Ships in 48 hours" },
                { sub: true, title: `Subscribe · save ${SUBSCRIBE_DISCOUNT * 100}%`, note: "Every 6 weeks, skip anytime" },
              ].map((o) => {
                const active = subscribe === o.sub;
                return (
                  <button
                    key={o.title}
                    type="button"
                    onClick={() => setSubscribe(o.sub)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition-colors",
                      active ? "bg-flame/10 ring-flame" : "ring-cream/15 hover:ring-cream/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ring-1",
                        active ? "ring-flame" : "ring-cream/40",
                      )}
                    >
                      {active && <motion.span layoutId="radio-dot" className="size-2 rounded-full bg-flame" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{o.title}</span>
                      <span className="block text-xs text-cream/55">
                        {formatPrice(unitPrice(flavor, size, o.sub))} · {o.note}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Fieldset>

          <div className="mt-7 flex items-center gap-3">
            <div className="flex h-16 items-center rounded-full ring-1 ring-inset ring-cream/15">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid size-14 place-items-center rounded-full transition hover:bg-cream/10"
              >
                <MinusIcon />
              </button>
              <span className="relative w-8 overflow-hidden text-center font-mono tabular-nums">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={qty}
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -18, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="block"
                  >
                    {qty}
                  </motion.span>
                </AnimatePresence>
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(12, q + 1))}
                className="grid size-14 place-items-center rounded-full transition hover:bg-cream/10"
              >
                <PlusIcon />
              </button>
            </div>
            <div className="flex-1">
              <AddToCartButton
                line={{ kind: "jar", flavorId: flavor.id, size, subscribe }}
                qty={qty}
                color={flavor.colors.sauce}
                title={`${qty} × ${flavor.name} added`}
                body={`${sizeLabel} · ${subscribe ? "subscription" : "one-time"}`}
                price={formatPrice(price * qty)}
              />
            </div>
          </div>

          <ul className="mt-6 grid grid-cols-3 gap-3 border-t border-cream/10 pt-6 font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-cream/60 sm:text-[10px]">
            <li>Free shipping over $40</li>
            <li>Ships in 48h, insulated</li>
            <li>Recyclable glass + steel</li>
          </ul>

          <div className="mt-6">
            <Details title="Ingredients">{flavor.ingredients}</Details>
            <Details title="Tasting notes">
              {flavor.notes.join(" · ")}. Best with {flavor.pairings.join(", ").toLowerCase()}.
            </Details>
            <Details title="Shipping & returns">
              Orders ship within 48 hours in recyclable, insulated packaging. If a jar arrives anything less than
              perfect, we&apos;ll replace it — no photos, no forms.
            </Details>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fieldset({ legend, value, children }: { legend: string; value?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-7">
      <legend className="mb-3 flex w-full justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
        <span>{legend}</span>
        {value && <span className="text-cream/80">{value}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Details({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-cream/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left font-mono text-[11px] uppercase tracking-[0.22em] transition-colors hover:text-flame"
      >
        {title}
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}>
          <PlusIcon size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-cream/70">{children}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
