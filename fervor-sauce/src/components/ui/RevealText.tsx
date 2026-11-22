import { useRef, type ElementType } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn, prefersReducedMotion } from "@/lib/utils";
import { tokenizeAccents } from "@/lib/text";

interface RevealTextProps {
  /** Plain text. Wrap words in *asterisks* to apply `accentClassName`; use \n for line breaks. */
  text: string;
  as?: ElementType;
  className?: string;
  accentClassName?: string;
  by?: "word" | "char";
  delay?: number;
  stagger?: number;
  duration?: number;
  start?: string;
  /** When provided, the reveal waits for this to become true instead of scrolling into view. */
  when?: boolean;
  id?: string;
}

const HIDDEN = { transform: "translateY(118%)" } as const;

/**
 * Masked word/char reveal. Each unit slides up out of an overflow mask with
 * a slight rotation, staggered — the editorial reveal used for headlines.
 */
export function RevealText({
  text,
  as: Tag = "span",
  className,
  accentClassName = "font-serif italic normal-case text-flame",
  by = "word",
  delay = 0,
  stagger,
  duration = 1.15,
  start = "top 88%",
  when,
  id,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || when === false) return;
      const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
      if (prefersReducedMotion()) {
        gsap.set(items, { y: 0, yPercent: 0, rotate: 0, opacity: 1 });
        return;
      }
      gsap.fromTo(
        items,
        // y: 0 — GSAP would otherwise adopt the inline hidden translate as a pixel offset
        { y: 0, yPercent: 118, rotate: by === "char" ? 6 : 3.5, opacity: 1 },
        {
          y: 0,
          yPercent: 0,
          rotate: 0,
          duration,
          ease: "expo.out",
          delay,
          stagger: stagger ?? (by === "char" ? 0.028 : 0.055),
          scrollTrigger: when === undefined ? { trigger: el, start, once: true } : undefined,
        },
      );
    },
    { scope: ref, dependencies: [when, text] },
  );

  const lines = tokenizeAccents(text);
  let key = 0;
  return (
    <Tag ref={ref} className={className} id={id} aria-label={text.replace(/\*/g, "").replace(/\n/g, " ")}>
      {lines.map((line, li) => (
        <span key={li} className="block" aria-hidden>
          {line.map(({ word: clean, accent }, wi, arr) => {
              const content =
                by === "char" ? (
                  [...clean].map((ch) => (
                    <span key={key++} className="reveal-mask">
                      <span data-reveal className="inline-block origin-bottom-left will-change-transform" style={HIDDEN}>
                        {ch}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="reveal-mask">
                    <span data-reveal className="inline-block origin-bottom-left will-change-transform" style={HIDDEN}>
                      {clean}
                    </span>
                  </span>
                );
              return (
                <span key={key++} className={cn("inline-block whitespace-nowrap", accent && accentClassName)}>
                  {content}
                  {wi < arr.length - 1 && <span className="inline-block">&nbsp;</span>}
                </span>
              );
            })}
        </span>
      ))}
    </Tag>
  );
}
