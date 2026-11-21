import { useId } from "react";
import { mulberry32 } from "@/lib/random";
import { cn } from "@/lib/utils";

function tornPoints(seed: number, w = 1440, base = 46, amp = 22) {
  const r = mulberry32(seed);
  const pts: [number, number][] = [];
  let x = w;
  while (x > 0) {
    const y = base + (r() - 0.4) * amp + (r() > 0.86 ? amp * 0.6 : 0);
    pts.push([x, y]);
    x -= 10 + r() * 30;
  }
  pts.push([0, base + (r() - 0.4) * amp]);
  return pts;
}

const PTS = tornPoints(7);
const EDGE = PTS.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
const FILL_PATH = `M0 0 H1440 V${PTS[0][1].toFixed(1)} L${EDGE} Z`;
const EMBER_PATH = `M${EDGE.replace(/ L/g, " L")}`;

/**
 * Scorched paper edge: tears one section into the next with a faint
 * glowing ember line along the burn. `currentColor` is the colour above.
 */
export function TornEdge({ className, flip = false }: { className?: string; flip?: boolean }) {
  const id = `ember-${useId().replace(/[^a-zA-Z0-9-_]/g, "")}`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      className={cn("pointer-events-none block h-[6vw] max-h-24 min-h-10 w-full", flip && "rotate-180", className)}
    >
      <defs>
        <filter id={id} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path d={EMBER_PATH} fill="none" stroke="#ffb04a" strokeWidth="6" opacity="0.55" filter={`url(#${id})`} />
      <path d={FILL_PATH} fill="currentColor" />
      <path d={EMBER_PATH} fill="none" stroke="#ff7a2c" strokeWidth="1.2" opacity="0.8" />
    </svg>
  );
}
