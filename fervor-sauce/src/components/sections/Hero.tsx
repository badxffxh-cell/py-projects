"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { gsap, useGSAP } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/lenis";
import { FLAVORS } from "@/lib/products";
import { useUI } from "@/lib/store";
import { ArrowDown, ArrowRight, StarIcon } from "../ui/Icons";
import { JarIllustration } from "../ui/JarIllustration";
import { MagneticButton } from "../ui/MagneticButton";
import { EASE_OUT_EXPO } from "../ui/Motion";
import { RevealText } from "../ui/RevealText";

const fade = (delay: number, show: boolean) => ({
  initial: { opacity: 0, y: 24 },
  animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
  transition: { duration: 1.1, ease: EASE_OUT_EXPO, delay },
});

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const introDone = useUI((s) => s.introDone);
  const webgl = useUI((s) => s.webgl);

  // Content drifts up and dissolves as the jar takes over the next scene.
  useGSAP(
    () => {
      gsap.to("[data-hero-out]", {
        yPercent: -40,
        opacity: 0,
        ease: "none",
        stagger: 0.04,
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom 35%", scrub: true },
      });
    },
    { scope: ref },
  );

  return (
    <section id="hero" ref={ref} className="relative h-svh min-h-[640px]">
      {/* background layer (below the canvas) */}
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden tex-charcoal">
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_48%,rgb(255_91_31/0.16),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,var(--color-cream)_1px,transparent_1px)] [background-size:calc(100%/12)_100%]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
      </div>

      {/* no-WebGL fallback: DOM wordmark + illustrated jar */}
      {webgl === false && (
        <div aria-hidden className="absolute inset-0 z-[5] grid place-items-center overflow-hidden">
          <p className="absolute top-[22%] w-full text-center font-display text-[27vw] leading-none text-flame">FERVOR</p>
          <JarIllustration flavor={FLAVORS[0]} className="relative h-[52vh] w-auto drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]" />
        </div>
      )}

      {/* content layer (above the canvas) */}
      <div className="relative z-20 mx-auto flex h-full max-w-[1600px] flex-col justify-between px-5 pb-6 pt-24 md:px-8 md:pb-8 md:pt-28">
        <h1 className="sr-only">FERVOR — small-batch fire sauce, charred over oak and fermented thirty days</h1>

        <div data-hero-out className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-cream/70 md:text-[11px]">
          <motion.p {...fade(0.2, introDone)} className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-flame shadow-[0_0_12px_2px_rgb(255_91_31/0.8)]" />
            Batch Nº 027 — now shipping
          </motion.p>
          <motion.p {...fade(0.3, introDone)} className="hidden text-right md:block">
            Charred · Fermented · Jarred by hand
            <br />
            <span className="text-ash">300 numbered jars per batch</span>
          </motion.p>
        </div>

        {/* callouts around the jar (desktop) — glass chips so they read over the wordmark */}
        <div data-hero-out aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <motion.div
            {...fade(0.9, introDone)}
            className="absolute right-[calc(50%+11.5vw)] top-[33%] flex items-center gap-3"
          >
            <span className="flex items-center gap-3 rounded-full bg-ink/55 py-1.5 pl-1.5 pr-5 ring-1 ring-inset ring-cream/15 backdrop-blur-md">
              <span className="grid size-8 place-items-center rounded-full bg-flame font-mono text-[10px] text-ink">01</span>
              <span className="font-serif text-xl italic leading-none">Charred over white oak</span>
            </span>
            <motion.span
              className="h-px w-[4.5vw] origin-left bg-gradient-to-r from-cream/60 to-flame"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: introDone ? 1 : 0 }}
              transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 1.1 }}
            />
            <span className="size-2 rounded-full bg-flame shadow-[0_0_14px_3px_rgb(255_91_31/0.7)]" />
          </motion.div>
          <motion.div
            {...fade(1.05, introDone)}
            className="absolute left-[calc(50%+11.5vw)] top-[57%] flex items-center gap-3"
          >
            <span className="size-2 rounded-full bg-flame shadow-[0_0_14px_3px_rgb(255_91_31/0.7)]" />
            <motion.span
              className="h-px w-[4.5vw] origin-right bg-gradient-to-r from-flame to-cream/60"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: introDone ? 1 : 0 }}
              transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 1.25 }}
            />
            <span className="flex items-center gap-3 rounded-full bg-ink/55 py-1.5 pl-1.5 pr-5 ring-1 ring-inset ring-cream/15 backdrop-blur-md">
              <span className="grid size-8 place-items-center rounded-full bg-flame font-mono text-[10px] text-ink">02</span>
              <span className="font-serif text-xl italic leading-none">Fermented thirty days</span>
            </span>
          </motion.div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div data-hero-out className="max-w-xl">
            <motion.p
              {...fade(0.35, introDone)}
              className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-flame md:text-[11px]"
            >
              Small-batch fire sauce — est. 2019
            </motion.p>
            <RevealText
              as="h2"
              text={"Heat that *tastes*\nlike something."}
              when={introDone}
              delay={0.25}
              className="font-display text-[clamp(2.5rem,4.3vw,4.6rem)] uppercase leading-[0.9] tracking-[-0.01em]"
              accentClassName="font-serif italic normal-case text-flame tracking-normal"
            />
            <motion.div {...fade(0.85, introDone)} className="mt-6 flex flex-wrap items-center gap-3">
              <MagneticButton
                href="#shop"
                size="lg"
                icon={<ArrowRight />}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget("#shop");
                }}
              >
                Shop the batch
              </MagneticButton>
              <MagneticButton
                href="#flavors"
                variant="ghost"
                size="lg"
                wrapperClassName="hidden sm:inline-block"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget("#flavors");
                }}
              >
                Explore flavors
              </MagneticButton>
            </motion.div>
          </div>

          <div data-hero-out className="flex items-end justify-between gap-6 md:flex-col md:items-end">
            <motion.div {...fade(1, introDone)} className="md:text-right">
              <div className="flex items-center gap-1 text-flame md:justify-end">
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
              <p className="mt-2 font-display text-3xl leading-none">4.9 / 5</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ash">2,314 verified reviews</p>
            </motion.div>
            <motion.button
              {...fade(1.15, introDone)}
              type="button"
              onClick={() => scrollToTarget("#story")}
              className="group flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/70 transition hover:text-cream"
            >
              Scroll to ignite
              <span className="grid size-11 place-items-center rounded-full ring-1 ring-cream/25 transition group-hover:bg-flame group-hover:text-ink group-hover:ring-flame">
                <motion.span animate={{ y: [0, 5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                  <ArrowDown size={16} />
                </motion.span>
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
