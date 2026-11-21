import type { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll choreography for the hero jar.
 *
 * Each section registers a ScrollTrigger (no tween attached) plus the pose
 * the jar should reach by the end of that trigger. Every frame the scene
 * folds the triggers' progress into a single pose:
 *
 *   pose = HERO
 *   for each transition: pose = lerp(pose, transition.to, ease(progress))
 *
 * Because the fold is recomputed from scratch, jumping anywhere on the page
 * (anchor links, refresh mid-page, resize) always yields the correct pose —
 * there is no tween state to fall out of sync.
 */

export interface JarPose {
  /** Horizontal offset as a fraction of viewport width (0 = centre). */
  x: number;
  /** Vertical offset as a fraction of viewport height (+ = up). */
  y: number;
  scale: number;
  /** Target rotation around Y (radians) when auto-spin is off. */
  rot: number;
  /** Forward / back lean (radians). */
  tilt: number;
  /** 0 = lid screwed on, 1 = lid floating open. */
  lid: number;
  steam: number;
  /** How far spice particles drift from the jar. */
  spread: number;
  /** 0..1 blend between "face the camera" and continuous idle spin. */
  spin: number;
  visible: number;
  /** Opacity of the giant hero wordmark behind the jar. */
  backdrop: number;
  /** Whether the jar can be grabbed in this section. */
  drag: number;
}

export const POSE_KEYS: (keyof JarPose)[] = [
  "x",
  "y",
  "scale",
  "rot",
  "tilt",
  "lid",
  "steam",
  "spread",
  "spin",
  "visible",
  "backdrop",
  "drag",
];

const base: JarPose = {
  x: 0,
  y: 0,
  scale: 1,
  rot: 0,
  tilt: 0,
  lid: 0,
  steam: 0,
  spread: 0.2,
  spin: 0,
  visible: 1,
  backdrop: 0,
  drag: 0,
};

const pose = (p: Partial<JarPose>): JarPose => ({ ...base, ...p });

export type PoseName =
  | "hero"
  | "story"
  | "storyEnd"
  | "process"
  | "processEnd"
  | "ingredients"
  | "ingredientsEnd"
  | "flavors"
  | "shop"
  | "shopOut"
  | "exit";

export const POSES: Record<"desktop" | "mobile", Record<PoseName, JarPose>> = {
  desktop: {
    hero: pose({ y: -0.035, lid: 1, steam: 1, spread: 0, spin: 1, backdrop: 1, drag: 1 }),
    story: pose({ x: 0.25, y: -0.01, scale: 0.8, rot: 0.5, tilt: -0.05, spread: 0.3, spin: 0.15 }),
    storyEnd: pose({ x: 0.25, y: 0.02, scale: 0.84, rot: 1.35, tilt: 0.04, spread: 0.35, spin: 0.15 }),
    process: pose({ x: -0.26, y: -0.02, scale: 0.88, rot: -0.4, tilt: 0.06, spread: 0.1 }),
    processEnd: pose({ x: -0.26, y: 0.0, scale: 0.88, rot: 0.45, tilt: -0.04, spread: 0.1 }),
    ingredients: pose({ y: -0.02, scale: 0.66, lid: 0.6, steam: 0.55, spread: 1, spin: 0.55 }),
    ingredientsEnd: pose({ y: 0.0, scale: 0.7, lid: 0.25, steam: 0.2, spread: 0.85, spin: 0.55 }),
    flavors: pose({ y: 0.005, scale: 0.98, spread: 0.4, drag: 1 }),
    shop: pose({ x: -0.235, y: -0.01, scale: 1.08, rot: -0.3, spread: 0.05, drag: 1 }),
    shopOut: pose({ x: -0.235, y: -0.01, scale: 1.08, rot: -0.3, spread: 0.05, drag: 1 }),
    exit: pose({ x: -0.235, y: 0.95, scale: 0.7, rot: 1.6, spread: 0, visible: 0 }),
  },
  mobile: {
    hero: pose({ y: 0.14, scale: 0.56, lid: 1, steam: 1, spread: 0, spin: 1, backdrop: 1, drag: 1 }),
    story: pose({ x: 0.3, y: 0.25, scale: 0.46, rot: 0.5, spread: 0.15, spin: 0.15 }),
    storyEnd: pose({ x: 0.28, y: 0.27, scale: 0.48, rot: 1.35, spread: 0.2, spin: 0.15 }),
    // the orange process section reads better without the jar on small screens
    process: pose({ x: -0.9, y: 0.22, scale: 0.46, rot: -0.4, spread: 0 }),
    processEnd: pose({ x: -0.9, y: 0.22, scale: 0.46, rot: 0.45, spread: 0 }),
    ingredients: pose({ y: 0.11, scale: 0.43, lid: 0.6, steam: 0.5, spread: 0.6, spin: 0.55 }),
    ingredientsEnd: pose({ y: 0.11, scale: 0.43, lid: 0.25, steam: 0.2, spread: 0.5, spin: 0.55 }),
    flavors: pose({ y: 0.13, scale: 0.62, spread: 0.3, drag: 1 }),
    shop: pose({ y: 0.21, scale: 0.58, rot: -0.3, spread: 0.05, drag: 1 }),
    // scrolls up and away so the configurator is never covered
    shopOut: pose({ y: 0.95, scale: 0.5, rot: 0.6, spread: 0, drag: 0 }),
    exit: pose({ y: 1.0, scale: 0.45, rot: 1.6, spread: 0, visible: 0 }),
  },
};

export interface Transition {
  st: ScrollTrigger;
  to: PoseName;
  ease: (t: number) => number;
}

const transitions: Transition[] = [];

export function setTransitions(list: Transition[]) {
  transitions.length = 0;
  transitions.push(...list);
}

export function clearTransitions() {
  transitions.length = 0;
}

export function composePose(out: JarPose, layout: "desktop" | "mobile"): JarPose {
  const set = POSES[layout];
  Object.assign(out, set.hero);
  for (const tr of transitions) {
    const p = tr.st.progress;
    if (p <= 0) continue;
    const t = tr.ease(Math.min(1, p));
    const to = set[tr.to];
    for (const k of POSE_KEYS) out[k] += (to[k] - out[k]) * t;
  }
  return out;
}

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
