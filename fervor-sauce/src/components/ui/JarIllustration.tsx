import { useId } from "react";
import type { Flavor } from "@/lib/products";
import { FLAME_PATH } from "./Icons";

/**
 * Hand-built SVG of the jar, matched to the 3D model's art direction.
 * Used for product cards, the cart and as the no-WebGL fallback.
 */
export function JarIllustration({
  flavor,
  className,
  detailed = true,
}: {
  flavor: Flavor;
  className?: string;
  detailed?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const c = flavor.colors;
  return (
    <svg viewBox="0 0 120 168" className={className} role="img" aria-label={`${flavor.name} jar`}>
      <defs>
        <linearGradient id={`sauce-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={c.sauce} />
          <stop offset="1" stopColor={c.sauceDeep} />
        </linearGradient>
        <linearGradient id={`glass-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.12" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.82" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`lid-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2a2220" />
          <stop offset="0.3" stopColor="#0d0a09" />
          <stop offset="0.62" stopColor="#3a302c" />
          <stop offset="1" stopColor="#0d0a09" />
        </linearGradient>
        <clipPath id={`body-${id}`}>
          <path d="M22 44c0-6 8-9 12-10h52c4 1 12 4 12 10v104c0 7-5 12-12 12H34c-7 0-12-5-12-12Z" />
        </clipPath>
      </defs>

      <ellipse cx="60" cy="162" rx="44" ry="5" fill="#000" opacity="0.35" />

      {/* body */}
      <g clipPath={`url(#body-${id})`}>
        <rect x="0" y="0" width="120" height="168" fill="#ffffff" opacity="0.06" />
        <rect x="0" y="58" width="120" height="110" fill={`url(#sauce-${id})`} />
        <ellipse cx="60" cy="58" rx="40" ry="3" fill={c.sauce} />
        {detailed &&
          [
            [32, 66],
            [44, 72],
            [78, 64],
            [90, 70],
            [36, 140],
            [52, 146],
            [70, 142],
            [86, 148],
          ].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="1.6" ry="0.9" fill={c.seed} opacity="0.85" />)}
        {/* label */}
        <rect x="18" y="76" width="84" height="58" fill={c.labelBg} />
        <rect x="18" y="79" width="84" height="0.8" fill={c.foil} />
        <rect x="18" y="130" width="84" height="0.8" fill={c.foil} />
        <text
          x="60"
          y="104"
          textAnchor="middle"
          fill={c.foil}
          style={{ fontFamily: "var(--font-anton), Impact, sans-serif", fontSize: 17, letterSpacing: 0.6 }}
        >
          FERVOR
        </text>
        <text
          x="60"
          y="119"
          textAnchor="middle"
          fill={c.labelInk}
          style={{ fontFamily: "var(--font-instrument), Georgia, serif", fontStyle: "italic", fontSize: 12 }}
        >
          {flavor.name}
        </text>
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            d={FLAME_PATH}
            transform={`translate(${46.5 + i * 5.6} 122.4) scale(0.2)`}
            fill={i < flavor.heat ? c.foil : "none"}
            stroke={i < flavor.heat ? "none" : c.labelMuted}
            strokeWidth="2"
          />
        ))}
        <rect x="0" y="0" width="120" height="168" fill={`url(#glass-${id})`} />
      </g>
      {/* rim + threads */}
      <rect x="30" y="28" width="60" height="8" rx="2" fill="#ffffff" opacity="0.14" />
      {/* lid */}
      <rect x="27" y="8" width="66" height="23" rx="3.5" fill={`url(#lid-${id})`} />
      {detailed &&
        Array.from({ length: 21 }, (_, i) => (
          <rect key={i} x={29.5 + i * 3} y="13" width="1" height="15" fill="#ffffff" opacity="0.07" />
        ))}
      <rect x="27" y="8" width="66" height="3" rx="1.5" fill="#ffffff" opacity="0.12" />
      {/* glass outline */}
      <path
        d="M22 44c0-6 8-9 12-10h52c4 1 12 4 12 10v104c0 7-5 12-12 12H34c-7 0-12-5-12-12Z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1"
      />
      <path d="M27 50v90" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M93 54v70" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
