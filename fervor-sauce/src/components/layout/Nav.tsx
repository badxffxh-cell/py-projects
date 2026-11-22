import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { scrollToTarget, lockScroll } from "@/lib/lenis";
import { scroll } from "@/lib/sceneState";
import { cartCount, useCart, useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BagIcon, CloseIcon, FlameIcon, MenuIcon } from "../ui/Icons";
import { EASE_OUT_EXPO } from "@/lib/motion";

const NAV_LINKS = [
  { href: "#story", label: "Story" },
  { href: "#ingredients", label: "Ingredients" },
  { href: "#flavors", label: "Flavors" },
  { href: "#shop", label: "Shop" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <FlameIcon size={18} className="text-flame" />
      <span className="font-display text-[22px] leading-none tracking-[0.02em]">FERVOR</span>
    </span>
  );
}

export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const introDone = useUI((s) => s.introDone);
  const menuOpen = useUI((s) => s.menuOpen);
  const setMenuOpen = useUI((s) => s.setMenuOpen);
  const flying = useUI((s) => s.flights.length > 0);

  useEffect(() => {
    let lastHidden = false;
    let lastSolid = false;
    const tick = () => {
      const y = scroll.y || window.scrollY;
      const v = scroll.velocity;
      const h = y > 240 && v > 0.5 ? true : v < -0.5 || y < 240 ? false : lastHidden;
      const s = y > 60;
      if (h !== lastHidden) setHidden((lastHidden = h));
      if (s !== lastSolid) setSolid((lastSolid = s));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-5 md:pt-4"
        initial={{ y: "-120%" }}
        animate={{ y: !introDone || (hidden && !menuOpen && !flying) ? "-120%" : "0%" }}
        transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: introDone && !hidden ? 0.05 : 0 }}
      >
        <nav
          aria-label="Primary"
          className={cn(
            "mx-auto flex h-14 max-w-[1600px] items-center justify-between rounded-full pl-5 pr-2 transition-[background-color,box-shadow,backdrop-filter] duration-500",
            solid || menuOpen
              ? "bg-ink/55 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.6)] ring-1 ring-inset ring-cream/10 backdrop-blur-xl"
              : "bg-transparent",
          )}
        >
          <a
            href="#hero"
            aria-label="Fervor — back to top"
            className="text-cream"
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              scrollToTarget(0);
            }}
          >
            <Logo />
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="group block rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/80 transition-colors hover:text-cream"
                >
                  <span className="relative block overflow-hidden">
                    <span className="block transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-full">
                      {l.label}
                    </span>
                    <span
                      aria-hidden
                      className="absolute inset-0 block translate-y-full text-flame transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0"
                    >
                      {l.label}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <span className="mr-2 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-ash lg:flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-flame opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-flame" />
              </span>
              Batch 027 live
            </span>
            <CartButton />
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full text-cream ring-1 ring-inset ring-cream/15 transition hover:bg-cream/10 md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </nav>
      </motion.header>
      <MobileMenu />
    </>
  );
}

function CartButton() {
  const count = useCart((s) => cartCount(s.lines));
  const bump = useUI((s) => s.cartBump);
  const setCartOpen = useUI((s) => s.setCartOpen);
  return (
    <motion.button
      type="button"
      data-cart-target
      data-cursor="Cart"
      onClick={() => setCartOpen(true)}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      key={bump}
      animate={bump ? { scale: [1, 1.18, 0.94, 1] } : undefined}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="group relative flex h-11 items-center gap-2.5 rounded-full bg-flame pl-4 pr-1.5 text-ink transition-colors hover:bg-cream"
    >
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em]">Cart</span>
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-ink text-cream">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={count}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className="font-mono text-[11px] tabular-nums"
          >
            {count > 0 ? count : <BagIcon size={15} />}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

function MobileMenu() {
  const open = useUI((s) => s.menuOpen);
  const setOpen = useUI((s) => s.setMenuOpen);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[39] flex flex-col justify-end bg-flame px-5 pb-10 pt-28 tex-flame text-ink md:hidden"
          initial={{ clipPath: "circle(0% at 92% 4%)" }}
          animate={{ clipPath: "circle(150% at 92% 4%)" }}
          exit={{ clipPath: "circle(0% at 92% 4%)" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <ul className="flex flex-col gap-1">
            {[{ href: "#hero", label: "Home" }, ...NAV_LINKS].map((l, i) => (
              <li key={l.href} className="overflow-hidden">
                <motion.a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "110%" }}
                  transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.15 + i * 0.06 }}
                  className="flex items-baseline justify-between border-b border-ink/20 py-2 font-display text-[15vw] uppercase leading-[0.95]"
                >
                  {l.label}
                  <span className="font-mono text-xs tracking-widest">0{i + 1}</span>
                </motion.a>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em]">
            Free shipping over $40 · Ships in 48h
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
