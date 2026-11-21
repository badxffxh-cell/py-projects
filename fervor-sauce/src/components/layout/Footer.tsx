"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/lenis";
import { FLAVORS } from "@/lib/products";
import { prefersReducedMotion } from "@/lib/utils";
import { ArrowUpRight, FlameIcon } from "../ui/Icons";

const COLUMNS = [
  { title: "Shop", links: [...FLAVORS.map((f) => ({ label: f.name, href: "#shop" })), { label: "The Full Flight", href: "#collection" }] },
  {
    title: "Atelier",
    links: [
      { label: "Our story", href: "#story" },
      { label: "Process", href: "#process" },
      { label: "Ingredients", href: "#ingredients" },
      { label: "Reviews", href: "#reviews" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Shipping", href: "#shop" },
      { label: "Subscriptions", href: "#shop" },
      { label: "Wholesale", href: "#join" },
      { label: "Contact", href: "#join" },
    ],
  },
];

export function Footer() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        "[data-footer-char]",
        { yPercent: 100 },
        {
          yPercent: 0,
          ease: "expo.out",
          duration: 1.4,
          stagger: 0.06,
          scrollTrigger: { trigger: "[data-footer-word]", start: "top 95%", once: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <footer ref={ref} className="relative z-20 overflow-hidden bg-ink text-cream">
      <div aria-hidden className="absolute inset-0 tex-charcoal" />
      <div className="relative mx-auto max-w-[1600px] px-5 pt-20 md:px-8 md:pt-28">
        <div className="grid gap-12 border-t border-cream/10 pt-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="flex items-center gap-2 font-display text-3xl">
              <FlameIcon className="text-flame" /> FERVOR
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
              Small-batch fire sauce. Charred over oak, fermented thirty days, jarred by hand — three hundred numbered
              jars at a time.
            </p>
            <button
              type="button"
              onClick={() => scrollToTarget(0, { duration: 2.2 })}
              className="group mt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/70 transition hover:text-flame"
            >
              <span className="grid size-10 place-items-center rounded-full ring-1 ring-cream/25 transition group-hover:-translate-y-1 group-hover:bg-flame group-hover:text-ink group-hover:ring-flame">
                <ArrowUpRight size={16} className="-rotate-45" />
              </span>
              Back to the fire
            </button>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash">{col.title}</p>
              <ul className="mt-5 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="group inline-flex items-center gap-1.5 text-[15px] text-cream/80 transition hover:text-flame"
                    >
                      <span className="relative">
                        {l.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-flame transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:origin-left group-hover:scale-x-100" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col justify-between gap-4 border-t border-cream/10 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-cream/45 md:flex-row">
          <p>© 2026 Fervor Sauce Atelier — a design concept</p>
          <p className="flex gap-6">
            <a href="#hero" className="hover:text-flame">Instagram</a>
            <a href="#hero" className="hover:text-flame">TikTok</a>
            <a href="#join" className="hover:text-flame">Newsletter</a>
          </p>
          <p>Keep it hot. Keep it real.</p>
        </div>
      </div>

      <div data-footer-word aria-hidden className="relative -mb-[3vw] flex select-none justify-center overflow-hidden px-2">
        {"FERVOR".split("").map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden">
            <span
              data-footer-char
              className="inline-block bg-gradient-to-b from-flame via-ember to-chili bg-clip-text font-display text-[30.5vw] leading-[0.92] text-transparent"
            >
              {ch}
            </span>
          </span>
        ))}
      </div>
    </footer>
  );
}
