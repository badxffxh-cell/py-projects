import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/lenis";
import { FLAVORS, formatPrice } from "@/lib/products";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "../cart/AddToCart";
import { HeatMeter } from "../ui/Motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Pinned flavour theatre. Scroll advances through the four sauces: the
 * stage colour floods, the giant name behind the jar re-sets letter by
 * letter, and the jar's label burns away to reveal the next flavour.
 */
export function Flavors() {
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const flavor = FLAVORS[index];
  const c = flavor.colors;
  const darkText = c.stageText !== "#f7efe4";
  // Frosted panels keep copy legible over the giant name behind the jar.
  const panel = cn(
    "rounded-[26px] p-5 ring-1 backdrop-blur-xl md:p-6",
    darkText ? "bg-cream/15 ring-ink/10" : "bg-ink/40 ring-cream/10",
  );

  useGSAP(
    () => {
      const n = FLAVORS.length;
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const i = Math.min(n - 1, Math.floor(self.progress * n));
          if (i !== indexRef.current) {
            indexRef.current = i;
            setIndex(i);
          }
          if (self.isActive) useUI.getState().setJarFlavor(FLAVORS[i].id);
        },
        onToggle: (self) => {
          if (self.isActive) useUI.getState().setJarFlavor(FLAVORS[indexRef.current].id);
        },
      });
      gsap.fromTo(
        "[data-flavor-progress]",
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

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    scrollToTarget(top + ((i + 0.5) / FLAVORS.length) * span, { duration: 1.4 });
  };

  return (
    <section
      id="flavors"
      ref={ref}
      className="relative h-[520vh]"
      aria-labelledby="flavors-title"
      style={{ color: c.stageText }}
    >
      {/* stage colour floods behind everything (below the canvas) */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 transition-[background-color] duration-1000 ease-[var(--ease-out-expo)]"
        style={{ backgroundColor: c.stage }}
      >
        <div className="sticky top-0 h-svh overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              darkText ? "tex-flame opacity-40 mix-blend-multiply" : "tex-charcoal opacity-100",
            )}
          />
          <div
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              background: `radial-gradient(45% 50% at 50% 55%, ${darkText ? "rgb(255 255 255 / 0.28)" : "rgb(255 91 31 / 0.2)"}, transparent 70%)`,
            }}
          />
        </div>
      </div>

      {/* giant name behind the jar */}
      <div aria-hidden className="absolute inset-0 z-[5]">
        <div className="sticky top-0 grid h-svh place-items-center overflow-hidden pb-[24svh] md:pb-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={flavor.id}
              className="flex font-display text-[30vw] uppercase leading-[0.8] md:text-[25vw]"
              style={{ color: darkText ? "rgb(10 7 6 / 0.9)" : c.accent }}
            >
              {[...flavor.name].map((ch, i) => (
                <span key={i} className="inline-block overflow-hidden">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "105%", rotate: 8 }}
                    animate={{ y: "0%", rotate: 0 }}
                    exit={{ y: "-105%", rotate: -8 }}
                    transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: i * 0.045 }}
                  >
                    {ch}
                  </motion.span>
                </span>
              ))}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* content */}
      <div className="absolute inset-0 z-20">
        <div className="sticky top-0 h-svh">
          <div className="mx-auto grid h-full max-w-[1600px] grid-rows-[auto_1fr_auto] px-5 pb-5 pt-24 md:px-8 md:pb-8 md:pt-28">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-70">(The flavors)</p>
                <h2 id="flavors-title" className="mt-2 font-serif text-3xl italic md:text-4xl">
                  Four ways to burn.
                </h2>
              </div>
              <div className="w-40 text-right md:w-64">
                <p className="font-display text-4xl leading-none tabular-nums md:text-5xl">
                  0{index + 1}
                  <span className="text-xl opacity-50 md:text-2xl"> / 0{FLAVORS.length}</span>
                </p>
                <div className="mt-3 h-px w-full bg-current/20">
                  <div data-flavor-progress className="h-full origin-left bg-current" />
                </div>
              </div>
            </div>

            <div className="grid grid-rows-[1fr_auto] md:grid-cols-[minmax(0,1fr)_minmax(28vw,1fr)_minmax(0,1fr)] md:grid-rows-1 md:items-center">
              <div className="row-start-2 md:row-start-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={flavor.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                    className={cn("max-w-sm", panel)}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-70">{flavor.descriptor}</p>
                    <p className="mt-3 font-display text-[clamp(2.2rem,3.6vw,3.6rem)] uppercase leading-[0.9]">
                      {flavor.tagline}
                    </p>
                    <p className="mt-4 hidden text-[15px] leading-relaxed opacity-75 md:block">{flavor.story}</p>
                    <div className="mt-5 flex items-center gap-4">
                      <HeatMeter
                        heat={flavor.heat}
                        size={20}
                        activeClass={darkText ? "text-ink" : "text-flame"}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
                        ~{flavor.scoville.toLocaleString("en-US")} SHU
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="row-start-1 md:col-start-2" />

              <div className="row-start-2 hidden md:col-start-3 md:row-start-1 md:block">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={flavor.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.08 }}
                    className={cn("ml-auto max-w-xs", panel)}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-70">Tasting notes</p>
                    <ul className="mt-3 space-y-1">
                      {flavor.notes.map((n) => (
                        <li key={n} className="border-b border-current/20 pb-2 font-serif text-2xl italic">
                          {n}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] opacity-70">Pairs with</p>
                    <p className="mt-2 text-[15px] opacity-85">{flavor.pairings.join(" · ")}</p>
                    <div className="mt-7">
                      <AddToCartButton
                        line={{ kind: "jar", flavorId: flavor.id, size: "8oz", subscribe: false }}
                        color={c.sauce}
                        title={`${flavor.name} added`}
                        body="8 oz jar · one-time"
                        price={formatPrice(flavor.price)}
                        tone={darkText ? "ink" : "flame"}
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2 md:justify-center">
              {FLAVORS.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === index}
                  className={cn(
                    "relative flex-1 rounded-full px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] ring-1 ring-inset ring-current/25 transition-colors md:flex-none md:px-5",
                    i === index ? "" : "opacity-60 hover:opacity-100",
                  )}
                >
                  {i === index && (
                    <motion.span
                      layoutId="flavor-tab"
                      className="absolute inset-0 rounded-full bg-current"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className="relative transition-colors"
                    style={{ color: i === index ? c.stage : undefined }}
                  >
                    {f.name}
                  </span>
                </button>
              ))}
              <span className="ml-2 md:hidden">
                <AddToCartButton
                  compact
                  line={{ kind: "jar", flavorId: flavor.id, size: "8oz", subscribe: false }}
                  color={c.sauce}
                  title={`${flavor.name} added`}
                  tone={darkText ? "ink" : "flame"}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
