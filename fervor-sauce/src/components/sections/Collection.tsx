"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BUNDLE, FLAVORS, type Flavor, formatPrice } from "@/lib/products";
import { useUI } from "@/lib/store";
import { scrollToTarget } from "@/lib/lenis";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "../cart/AddToCart";
import { ArrowUpRight } from "../ui/Icons";
import { JarIllustration } from "../ui/JarIllustration";
import { EASE_OUT_EXPO, FadeIn, HeatMeter } from "../ui/Motion";
import { RevealText } from "../ui/RevealText";
import { TornEdge } from "../ui/TornEdge";

export function Collection() {
  return (
    <section id="collection" className="relative z-20 bg-cream text-ink" aria-labelledby="collection-title">
      <TornEdge className="absolute inset-x-0 top-0 text-ink" />
      <div className="mx-auto max-w-[1600px] px-5 pb-28 pt-32 md:px-8 md:pb-40 md:pt-44">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ember">(The collection)</p>
            <RevealText
              as="h2"
              id="collection-title"
              text={"All four,\n*small batch.*"}
              className="mt-4 font-display text-[clamp(3.4rem,8.5vw,8.5rem)] uppercase leading-[0.86] tracking-[-0.02em]"
              accentClassName="font-serif italic normal-case tracking-normal text-ember"
            />
          </div>
          <FadeIn className="max-w-sm md:pb-3">
            <p className="text-lg leading-relaxed text-ink/75">
              Every jar is numbered by hand. When a batch sells out, it&apos;s gone until the chiles are back in
              season.
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-ink/60">
              Free shipping over $40 · Ships in 48h
            </p>
          </FadeIn>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLAVORS.map((f, i) => (
            <FadeIn key={f.id} delay={i * 0.08}>
              <ProductCard flavor={f} />
            </FadeIn>
          ))}
        </div>

        <FadeIn className="mt-4">
          <BundleCard />
        </FadeIn>
      </div>
    </section>
  );
}

function ProductCard({ flavor }: { flavor: Flavor }) {
  const ref = useRef<HTMLElement>(null);
  const setShopFlavor = useUI((s) => s.setShopFlavor);
  const c = flavor.colors;
  const dark = c.stageText === "#f7efe4";

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
  const jx = useSpring(useTransform(mx, [0, 1], [-14, 14]), { stiffness: 160, damping: 18 });
  const px = useTransform(mx, (v) => `${v * 100}%`);
  const py = useTransform(my, (v) => `${v * 100}%`);
  const spot = useMotionTemplate`radial-gradient(420px circle at ${px} ${py}, ${dark ? "rgb(255 91 31 / 0.28)" : "rgb(255 255 255 / 0.35)"}, transparent 60%)`;

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000, backgroundColor: c.stage, color: c.stageText }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] p-5 md:p-6"
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: spot }} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0", dark ? "tex-charcoal opacity-60" : "opacity-50 tex-flame mix-blend-multiply")} />

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.25em]">0{flavor.index + 1}</span>
        <HeatMeter heat={flavor.heat} size={14} activeClass={dark ? "text-flame" : "text-ink"} />
      </div>

      <motion.div style={{ x: jx }} className="relative mx-auto my-6 h-64 md:h-72">
        <div className="h-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-3 group-hover:-rotate-3 group-hover:scale-[1.04]">
          <JarIllustration flavor={flavor} className="h-full w-auto drop-shadow-[0_30px_30px_rgb(0_0_0/0.45)]" />
        </div>
      </motion.div>

      <div className="relative mt-auto">
        <h3 className="font-display text-4xl uppercase leading-none">{flavor.name}</h3>
        <p className="mt-1.5 text-sm opacity-75">{flavor.descriptor}</p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl leading-none">{formatPrice(flavor.price)}</p>
            <button
              type="button"
              onClick={() => {
                setShopFlavor(flavor.id);
                scrollToTarget("#shop");
              }}
              className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70 transition hover:opacity-100"
            >
              Details <ArrowUpRight size={12} />
            </button>
          </div>
          <AddToCartButton
            compact
            line={{ kind: "jar", flavorId: flavor.id, size: "8oz", subscribe: false }}
            color={c.sauce}
            title={`${flavor.name} added`}
            body="8 oz jar · one-time"
            tone={dark ? "flame" : "ink"}
          />
        </div>
      </div>
    </motion.article>
  );
}

function BundleCard() {
  return (
    <article className="group relative grid overflow-hidden rounded-[28px] bg-ink p-6 text-cream md:grid-cols-[1.2fr_1fr] md:items-center md:p-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 tex-charcoal" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/2 size-[520px] -translate-y-1/2 rounded-full bg-flame/25 blur-3xl" />
      <div className="relative order-2 md:order-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-flame">Best value · save {formatPrice(BUNDLE.compareAt - BUNDLE.price)}</p>
        <h3 className="mt-3 font-display text-[clamp(3rem,6vw,6rem)] uppercase leading-[0.88]">
          The full <span className="font-serif italic normal-case text-flame">flight.</span>
        </h3>
        <p className="mt-4 max-w-md text-cream/70">
          All four sauces in a gift-ready box — smoke, citrus fire, umami and tropical heat. The fastest way to find
          your favorite (and your new one).
        </p>
        <div className="mt-7 flex max-w-md flex-col gap-4 sm:flex-row sm:items-center">
          <p className="shrink-0 font-display text-4xl leading-none">
            {formatPrice(BUNDLE.price)}{" "}
            <span className="text-xl text-cream/40 line-through">{formatPrice(BUNDLE.compareAt)}</span>
          </p>
          <AddToCartButton
            line={{ kind: "bundle" }}
            color="#ff5b1f"
            title={`${BUNDLE.name} added`}
            body={BUNDLE.descriptor}
            label="Add the flight"
          />
        </div>
      </div>
      <div className="relative order-1 flex h-64 items-end justify-center md:order-2 md:h-80">
        {FLAVORS.map((f, i) => (
          <motion.div
            key={f.id}
            className="-mx-5 h-full origin-bottom md:-mx-7"
            initial={{ y: 60, opacity: 0, rotate: 0 }}
            whileInView={{ y: 0, opacity: 1, rotate: (i - 1.5) * 7 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: i * 0.08 }}
            style={{ zIndex: i === 1 || i === 2 ? 2 : 1 }}
          >
            <div className="h-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-2">
              <JarIllustration flavor={f} className="h-full w-auto drop-shadow-[0_24px_30px_rgb(0_0_0/0.6)]" />
            </div>
          </motion.div>
        ))}
      </div>
    </article>
  );
}
