"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { PROCESS } from "@/lib/products";
import { prefersReducedMotion } from "@/lib/utils";
import { RevealText } from "../ui/RevealText";
import { TornEdge } from "../ui/TornEdge";

/**
 * "From fire to jar" — four steps on hot orange paper. Rules draw in, the
 * big numerals parallax, and the jar (left, in WebGL) turns with each step.
 */
export function Process() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: step, start: "top 82%", end: "top 40%", scrub: 0.8 },
        });
        tl.fromTo(step.querySelector("[data-rule]"), { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0)
          .fromTo(step.querySelector("[data-num]"), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "power2.out" }, 0)
          .fromTo(
            step.querySelectorAll("[data-fade]"),
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, ease: "power2.out", stagger: 0.08 },
            0.1,
          );
      });
      gsap.fromTo(
        "[data-ghost]",
        { xPercent: 8 },
        {
          xPercent: -18,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section id="process" ref={ref} className="relative text-ink" aria-labelledby="process-title">
      {/* background + tear (below the canvas) */}
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden tex-flame">
        <TornEdge className="absolute inset-x-0 top-0 text-ink" />
        <TornEdge flip className="absolute inset-x-0 bottom-0 text-ink" />
      </div>
      {/* ghost type behind the jar */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        <p
          data-ghost
          className="absolute top-[18%] whitespace-nowrap font-display text-[34vw] uppercase leading-none text-ink/[0.07]"
        >
          Fire · Smoke · Time
        </p>
      </div>

      <div className="relative z-20 mx-auto max-w-[1600px] px-5 pb-36 pt-40 md:px-8 md:pb-48 md:pt-52">
        <div className="md:ml-[46%]">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em]">(The process)</p>
          <RevealText
            as="h2"
            id="process-title"
            text={"From fire\nto *jar.*"}
            className="font-display text-[clamp(3.6rem,10vw,10rem)] uppercase leading-[0.84] tracking-[-0.02em]"
            accentClassName="font-serif italic normal-case tracking-normal text-cream"
          />
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink/80">
            No factories, no flavor houses. Four slow steps, done the same way since our first batch in a borrowed
            kitchen.
          </p>

          <ol className="mt-20 md:mt-28">
            {PROCESS.map((s) => (
              <li key={s.n} data-step className="relative py-9 md:py-11">
                <span data-rule aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-ink/40" />
                <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 md:grid-cols-[7rem_1fr_auto] md:gap-x-10">
                  <span data-num className="font-display text-6xl leading-none md:text-7xl">
                    {s.n}
                  </span>
                  <div>
                    <h3 data-fade className="font-display text-4xl uppercase leading-none md:text-5xl">
                      {s.title}
                    </h3>
                    <p data-fade className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/80">
                      {s.body}
                    </p>
                  </div>
                  <p
                    data-fade
                    className="col-start-2 self-start font-serif text-2xl italic md:col-start-3 md:text-right md:text-3xl"
                  >
                    {s.stat}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
