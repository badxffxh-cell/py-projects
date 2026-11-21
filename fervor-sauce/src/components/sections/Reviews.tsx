"use client";

import { PRESS, REVIEWS } from "@/lib/products";
import { cn } from "@/lib/utils";
import { FlameIcon, StarIcon } from "../ui/Icons";
import { Marquee } from "../ui/Marquee";
import { Counter, FadeIn } from "../ui/Motion";
import { RevealText } from "../ui/RevealText";
import { TornEdge } from "../ui/TornEdge";

const PRESS_STYLES = [
  "font-serif italic text-4xl",
  "font-display text-4xl tracking-wide",
  "font-serif text-4xl",
  "font-mono text-2xl font-medium tracking-[0.3em]",
  "font-sans text-3xl font-semibold tracking-tight",
  "font-serif italic text-3xl",
];

export function Reviews() {
  const half = Math.ceil(REVIEWS.length / 2);
  return (
    <section id="reviews" className="relative z-20 overflow-hidden text-ink" aria-labelledby="reviews-title">
      <div aria-hidden className="absolute inset-0 tex-flame" />
      <TornEdge className="absolute inset-x-0 top-0 text-cream" />
      <div className="relative pb-24 pt-32 md:pb-32 md:pt-44">
        <div className="mx-auto grid max-w-[1600px] gap-10 px-5 md:grid-cols-[auto_1fr] md:items-end md:gap-16 md:px-8">
          <FadeIn>
            <p className="font-display text-[clamp(6rem,15vw,15rem)] leading-[0.8] tabular-nums">
              <Counter to={4.9} from={0} format={(n) => n.toFixed(1)} />
            </p>
            <div className="mt-4 flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} size={18} />
              ))}
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.25em]">2,314 verified reviews</span>
            </div>
          </FadeIn>
          <div className="md:pb-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]">(Reviews)</p>
            <RevealText
              as="h2"
              id="reviews-title"
              text={"Loved by people\nwho *love heat.*"}
              className="mt-3 font-display text-[clamp(2.6rem,6vw,6rem)] uppercase leading-[0.9]"
              accentClassName="font-serif italic normal-case tracking-normal text-cream"
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 md:mt-20">
          <Marquee speed={38} skew>
            {REVIEWS.slice(0, half).map((r) => (
              <ReviewCard key={r.name} review={r} />
            ))}
          </Marquee>
          <Marquee speed={32} reverse skew>
            {REVIEWS.slice(half).map((r) => (
              <ReviewCard key={r.name} review={r} />
            ))}
          </Marquee>
        </div>

        <div className="mt-20 border-y border-ink/20 py-8">
          <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-[0.3em]">As tasted by</p>
          <Marquee speed={46} trackClassName="items-center">
            {PRESS.map((p, i) => (
              <span key={p} className="flex items-center">
                <span className={cn("whitespace-nowrap px-10 leading-none", PRESS_STYLES[i % PRESS_STYLES.length])}>{p}</span>
                <FlameIcon size={16} className="text-ink/60" />
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: (typeof REVIEWS)[number] }) {
  return (
    <figure className="mr-4 flex w-[min(78vw,420px)] shrink-0 flex-col justify-between rounded-3xl bg-ink p-6 text-cream md:p-7">
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 text-flame">
          {Array.from({ length: review.stars }, (_, i) => (
            <StarIcon key={i} />
          ))}
        </div>
        <span className="rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] ring-1 ring-cream/20">
          {review.flavor}
        </span>
      </div>
      <blockquote className="mt-6 font-serif text-[1.7rem] italic leading-[1.15]">“{review.quote}”</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/60">
        <span className="grid size-8 place-items-center rounded-full bg-flame font-display text-sm text-ink">
          {review.name[0]}
        </span>
        {review.name} · Verified buyer
      </figcaption>
    </figure>
  );
}
