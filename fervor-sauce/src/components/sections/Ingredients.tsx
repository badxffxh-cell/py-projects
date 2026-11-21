"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { INGREDIENTS } from "@/lib/products";
import { cn, prefersReducedMotion } from "@/lib/utils";
import { IngredientIcon } from "../ui/Icons";
import { RevealText } from "../ui/RevealText";

/**
 * Sticky ingredient spotlight. The jar sits centre stage with its lid
 * cracked open while spices burst outward (WebGL); six ingredient cards
 * ignite one at a time around it as you scroll.
 */
export function Ingredients() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-ing]");
      if (prefersReducedMotion()) {
        gsap.set(cards, { opacity: 1, x: 0, y: 0 });
        return;
      }
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: 0.7 },
      });
      cards.forEach((card, i) => {
        const side = Number(card.dataset.side);
        tl.fromTo(
          card,
          { opacity: 0, x: side * 60, y: 30, filter: "blur(8px)" },
          { opacity: 1, x: 0, y: 0, filter: "blur(0px)", duration: 1, ease: "power3.out" },
          i * 0.55,
        ).fromTo(
          card.querySelector("[data-leader]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: "power2.out" },
          i * 0.55 + 0.25,
        );
      });
      tl.to({}, { duration: 0.8 });
      gsap.fromTo(
        "[data-inside]",
        { scale: 0.85, opacity: 0 },
        {
          scale: 1.05,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top 60%", end: "bottom bottom", scrub: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section id="ingredients" ref={ref} className="relative h-[330vh]" aria-labelledby="ingredients-title">
      <div aria-hidden className="absolute inset-0 z-0 tex-charcoal">
        <div className="sticky top-0 h-svh bg-[radial-gradient(40%_45%_at_50%_52%,rgb(255_91_31/0.18),transparent_70%)]" />
      </div>
      {/* ghost word behind the jar */}
      <div aria-hidden className="absolute inset-0 z-[5]">
        <div className="sticky top-0 grid h-svh place-items-center overflow-hidden">
          <p data-inside className="font-display text-[30vw] uppercase leading-none text-outline text-cream/[0.09]">
            Inside
          </p>
        </div>
      </div>

      <div className="absolute inset-0 z-20">
        <div className="sticky top-0 flex h-svh flex-col px-5 pb-6 pt-24 md:px-8 md:pt-28">
          <div className="mx-auto w-full max-w-[1600px] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-flame">(Ingredients)</p>
            <RevealText
              as="h2"
              id="ingredients-title"
              text="Nothing *to hide.*"
              className="mt-3 font-display text-[clamp(2.6rem,6vw,6rem)] uppercase leading-[0.9]"
              accentClassName="font-serif italic normal-case tracking-normal text-flame"
            />
          </div>

          <div className="relative mx-auto mt-auto grid w-full max-w-[1600px] grid-cols-2 gap-2.5 md:mt-0 md:flex-1 md:grid-cols-[1fr_minmax(24vw,1fr)_1fr] md:items-center md:gap-0">
            {[0, 1].map((col) => (
              <ul
                key={col}
                className={cn(
                  "contents md:flex md:flex-col md:gap-5 lg:gap-7",
                  col === 0 ? "md:col-start-1 md:items-end" : "md:col-start-3 md:items-start",
                )}
              >
                {INGREDIENTS.filter((_, i) => i % 2 === col).map((ing) => (
                  <li
                    key={ing.id}
                    data-ing
                    data-side={col === 0 ? -1 : 1}
                    className={cn(
                      "relative w-full rounded-2xl bg-char/70 p-3.5 ring-1 ring-cream/10 backdrop-blur-md md:max-w-[340px] md:p-5",
                      col === 0 ? "md:text-right" : "",
                    )}
                  >
                    <span
                      data-leader
                      aria-hidden
                      className={cn(
                        "absolute top-1/2 hidden h-px w-[min(7vw,110px)] bg-gradient-to-r md:block",
                        col === 0
                          ? "left-full origin-left from-cream/40 to-flame"
                          : "right-full origin-right from-flame to-cream/40",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-flame shadow-[0_0_12px_3px_rgb(255_91_31/0.7)]",
                          col === 0 ? "-right-1" : "-left-1",
                        )}
                      />
                    </span>
                    <div className={cn("flex items-start gap-3 md:gap-4", col === 0 && "md:flex-row-reverse")}>
                      <span className="shrink-0 text-flame">
                        <IngredientIcon kind={ing.icon} size={40} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ash md:text-[10px]">
                          {ing.role} · {ing.origin}
                        </p>
                        <h3 className="mt-1 font-display text-xl uppercase leading-none md:text-2xl">{ing.name}</h3>
                        <p className="mt-2 hidden text-sm leading-relaxed text-cream/65 sm:block">{ing.note}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>

          <p className="mx-auto mt-4 hidden max-w-[1600px] font-mono text-[10px] uppercase tracking-[0.3em] text-ash md:block">
            No preservatives · No gums · No “natural flavors” · No shortcuts
          </p>
        </div>
      </div>
    </section>
  );
}
