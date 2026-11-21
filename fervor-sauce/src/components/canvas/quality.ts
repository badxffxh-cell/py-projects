export type Tier = "high" | "low";

export interface Quality {
  tier: Tier;
  labelWidth: number;
  spices: number;
  embers: number;
  dpr: [number, number];
}

export function detectQuality(): Quality {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const cores = navigator.hardwareConcurrency ?? 4;
  const low = coarse || small || cores <= 4;
  return low
    ? { tier: "low", labelWidth: 2048, spices: 0.55, embers: 70, dpr: [1, 1.5] }
    : { tier: "high", labelWidth: 3072, spices: 1, embers: 150, dpr: [1, 1.8] };
}

/** World-space position of the jar, shared with particles that orbit it. */
export const jarWorld = { x: 0, y: 0, scale: 1, spread: 0, visible: 1, backdrop: 1, lid: 1 };
