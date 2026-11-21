"use client";

import { motion } from "framer-motion";
import { useUI, type Flight } from "@/lib/store";

/** Little jars that arc from the add button into the cart. */
export function FlyToCart() {
  const flights = useUI((s) => s.flights);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[65]">
      {flights.map((f) => (
        <Sprite key={f.id} flight={f} />
      ))}
    </div>
  );
}

function Sprite({ flight }: { flight: Flight }) {
  const landFlight = useUI((s) => s.landFlight);
  // The nav may be mid-slide (hidden on scroll); aim for where the cart button rests.
  const btn = document.querySelector("[data-cart-target]");
  const target = btn?.getBoundingClientRect();
  const header = btn?.closest("header");
  const shift = header ? new DOMMatrixReadOnly(getComputedStyle(header).transform).m42 : 0;
  const tx = target ? target.left + target.width - 22 : window.innerWidth - 40;
  const ty = target ? target.top - shift + target.height / 2 : 40;
  const midX = flight.x + (tx - flight.x) * 0.45;
  const midY = Math.min(flight.y, ty) - 140;

  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: flight.x, y: flight.y, scale: 0.4, opacity: 0 }}
      animate={{
        x: [flight.x, midX, tx],
        y: [flight.y, midY, ty],
        scale: [0.6, 1.25, 0.35],
        opacity: [0, 1, 1],
        rotate: [0, -25, 15],
      }}
      transition={{ duration: 0.95, ease: [0.55, 0, 0.35, 1], times: [0, 0.45, 1] }}
      onAnimationComplete={() => landFlight(flight.id)}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <div className="mx-auto h-2.5 w-7 rounded-t-[4px] rounded-b-[2px] bg-[#16110f] ring-1 ring-cream/20" />
        <div
          className="mx-auto h-9 w-9 rounded-b-[10px] rounded-t-[6px] ring-1 ring-cream/40"
          style={{
            background: `linear-gradient(90deg, rgb(255 255 255 / 0.45), transparent 30%), ${flight.color}`,
            boxShadow: `0 0 40px 8px ${flight.color}66`,
          }}
        />
      </div>
    </motion.div>
  );
}
