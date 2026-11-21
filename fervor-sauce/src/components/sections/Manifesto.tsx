"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";
import { tokenizeAccents } from "@/lib/text";
import { Counter, FadeIn } from "../ui/Motion";

const MANIFESTO =
  "We think heat should *taste* like something. So we char chiles over *white oak,* let them ferment for *thirty slow days,* and jar them by hand — only when the flavor is *loud enough* to speak for itself.";

// `*multi word*` spans are set in the serif and ignite to flame orange.
const WORDS = tokenizeAccents(MANIFESTO)[0];

const STATS = [
  { to: 30, suffix: "", label: "Days of fermentation" },
  { to: 300, suffix: "", label: "Numbered jars per batch" },
  { to: 0, suffix: "", label: "Preservatives, gums or shortcuts" },
];

/**
 * Sticky manifesto: words ignite one by one as you scroll while the jar
 * screws its lid shut on the right.
 */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const words = gsap.utils.toArray<HTMLElement>("[data-word]");
      if (prefersReducedMotion()) {
        gsap.set(words, { opacity: 1 });
        return;
      }
      gsap.fromTo(
        words,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: ref.current, start: "top 35%", end: "bottom 85%", scrub: 0.6 },
        },
      );
      gsap.fromTo(
        "[data-hot]",
        { color: "#f7efe4" },
        {
          color: "#ff5b1f",
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: ref.current, start: "top 25%", end: "bottom 85%", scrub: 0.6 },
        },
      );
      gsap.fromTo(
        "[data-progress]",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section id="story" ref={ref} className="relative h-[240vh]" aria-labelledby="story-title">
      <div aria-hidden className="absolute inset-0 z-0 tex-charcoal" />
      <div className="sticky top-0 z-20 flex h-svh flex-col justify-end pb-[9vh] md:justify-center md:pb-0">
        <div className="mx-auto w-full max-w-[1600px] px-5 md:px-8">
          <div className="md:w-[60%]">
            <FadeIn className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 id="story-title" className="font-mono text-[11px] uppercase tracking-[0.3em] text-flame">
                (Our story)
              </h2>
              <p className="font-serif text-lg italic text-cream/60">
                fer·vor <span className="not-italic text-cream/40">(n.)</span> — from the Latin <em>fervēre</em>,
                “to boil.”
              </p>
            </FadeIn>

            <p className="text-balance text-[clamp(1.65rem,3.3vw,3.35rem)] font-medium leading-[1.08] tracking-[-0.02em]">
              {WORDS.map(({ word: clean, accent: hot }, i) => {
                return (
                  <span key={i}>
                    <span
                      data-word
                      data-hot={hot ? "" : undefined}
                      className={hot ? "font-serif font-normal italic tracking-normal" : undefined}
                    >
                      {clean}
                    </span>{" "}
                  </span>
                );
              })}
            </p>

            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-cream/15 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-none text-cream">
                    <Counter to={s.to} from={s.to === 0 ? 9 : 0} />
                  </p>
                  <p className="mt-2 max-w-[16ch] font-mono text-[9px] uppercase leading-relaxed tracking-[0.2em] text-ash md:text-[10px]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 h-px w-full max-w-2xl bg-cream/10">
              <div data-progress className="h-full origin-left bg-flame" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
