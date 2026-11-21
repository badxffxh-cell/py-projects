import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const FLAME_PATH =
  "M12 1.2c.9 3.2-.5 5.4-2.3 7.3C7.9 10.4 6 12.6 6 15.7c0 3.8 2.7 6.9 6 6.9s6-3.1 6-6.8c0-3-1.4-5.1-2.9-6.7-.3 1.8-1.2 3-2.5 3.6.6-4-.1-8.3-.6-10.5z";

export function FlameIcon({ size = 20, filled = true, ...p }: P & { filled?: boolean }) {
  return (
    <svg {...base(size)} {...p}>
      <path d={FLAME_PATH} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} />
    </svg>
  );
}

export function ArrowRight({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowUpRight({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function ArrowDown({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 4v15M6 13l6 6 6-6" />
    </svg>
  );
}

export function PlusIcon({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MinusIcon({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function CheckIcon({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function BagIcon({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </svg>
  );
}

export function StarIcon({ size = 14, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...p}>
      <path
        fill="currentColor"
        d="m12 2.6 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7z"
      />
    </svg>
  );
}

export function MenuIcon({ size = 22, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}

export function RotateIcon({ size = 18, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 12a9 4 0 1 0 9-4" />
      <path d="m10 5 2.5 3L9.8 10.5" />
    </svg>
  );
}

/* ---------------- Ingredient glyphs (line illustrations) ---------------- */

export function IngredientIcon({ kind, size = 44 }: { kind: string; size?: number }) {
  const common = { ...base(size), strokeWidth: 1.2, viewBox: "0 0 48 48" };
  switch (kind) {
    case "chile":
      return (
        <svg {...common}>
          <path d="M14 10c3 1 4 4 3 6" />
          <path d="M17 16c-4 4-5 12 0 19 4 5 10 7 16 6-6-4-9-10-10-17-1-5-2-7-6-8Z" />
          <path d="M20 22c0 5 2 10 6 14" opacity=".5" />
        </svg>
      );
    case "pepper":
      return (
        <svg {...common}>
          <path d="M24 8c0 3-1 5-3 6" />
          <path d="M21 14c-6 0-10 5-9 12 1 8 6 14 12 14s11-6 12-14c1-7-3-12-9-12-2 0-3 1-3 1s-1-1-3-1Z" />
          <path d="M24 15v24" opacity=".5" />
        </svg>
      );
    case "garlic":
      return (
        <svg {...common}>
          <path d="M24 6c0 4 1 6 1 8" />
          <path d="M25 14c-9 2-15 8-14 16 1 7 6 11 13 11s12-4 13-11c1-8-5-14-12-16Z" />
          <path d="M24 16c-4 5-5 14-2 24M26 16c4 5 5 14 2 24" opacity=".5" />
        </svg>
      );
    case "citrus":
      return (
        <svg {...common}>
          <circle cx="24" cy="25" r="14" />
          <circle cx="24" cy="25" r="10.5" opacity=".5" />
          <path d="M24 15v20M14 25h20M17 18l14 14M31 18 17 32" opacity=".5" />
        </svg>
      );
    case "honey":
      return (
        <svg {...common}>
          <path d="M24 7l11 6.5v13L24 33l-11-6.5v-13Z" />
          <path d="M24 33v8M20 41h8" />
          <path d="M13 19.5l11 6.5 11-6.5" opacity=".5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 30l6-12 6 8 6-10 6 14" />
          <path d="M10 34h28" />
          <path d="M17 38h14" opacity=".5" />
        </svg>
      );
  }
}
