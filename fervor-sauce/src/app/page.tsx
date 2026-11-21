import { Experience } from "@/components/Experience";
import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { Process } from "@/components/sections/Process";
import { Ingredients } from "@/components/sections/Ingredients";
import { Flavors } from "@/components/sections/Flavors";
import { Shop } from "@/components/sections/Shop";
import { Collection } from "@/components/sections/Collection";
import { Reviews } from "@/components/sections/Reviews";
import { Newsletter } from "@/components/sections/Newsletter";
import { Footer } from "@/components/layout/Footer";
import { Marquee } from "@/components/ui/Marquee";
import { FlameIcon } from "@/components/ui/Icons";

const TICKER = [
  "Free shipping over $40",
  "Batch Nº 027 now shipping",
  "Fermented thirty days",
  "Hand-numbered jars",
  "No preservatives, ever",
];

export default function Home() {
  return (
    <>
      <a
        href="#shop"
        className="fixed left-4 top-4 z-[90] -translate-y-24 rounded-full bg-cream px-4 py-2 text-sm text-ink focus:translate-y-0"
      >
        Skip to shop
      </a>
      <Experience />
      <main>
        <Hero />
        <div className="relative z-20 border-y border-cream/10 bg-ink py-3 text-cream/80">
          <Marquee speed={50}>
            {TICKER.map((t) => (
              <span key={t} className="flex items-center gap-6 pr-6 font-mono text-[11px] uppercase tracking-[0.3em]">
                {t}
                <FlameIcon size={12} className="text-flame" />
              </span>
            ))}
          </Marquee>
        </div>
        <Manifesto />
        <Process />
        <Ingredients />
        <Flavors />
        <Shop />
        <Collection />
        <Reviews />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
