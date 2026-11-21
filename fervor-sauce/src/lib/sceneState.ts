/**
 * Mutable, render-loop friendly state shared between the DOM (GSAP, Lenis,
 * pointer listeners) and the WebGL scene. Nothing here triggers React
 * renders — the R3F frame loop simply reads the latest values every frame.
 */

export const pointer = {
  /** Normalized device coords, -1..1 (y up). */
  x: 0,
  y: 0,
  /** Pixel coords. */
  px: 0,
  py: 0,
  moved: false,
};

export const scroll = {
  y: 0,
  /** Lenis velocity in px / frame (signed). */
  velocity: 0,
};

/** Screen-space bounds of the jar, written by the scene every frame. */
export const jarRect = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  /** 1 when the jar can be grabbed and spun in the current section. */
  draggable: 0,
};

export const drag = {
  active: false,
  /** Angular velocity injected by the pointer (rad / s). */
  velocity: 0,
  tilt: 0,
  lastX: 0,
  lastT: 0,
};

/** Intro choreography values tweened by the preloader (0 → 1). */
export const intro = {
  reveal: 0,
  jar: 0,
};

/** One-shot impulses the scene consumes (e.g. a spin when flavor changes). */
export const impulses = {
  spin: 0,
};

type FrameloopSetter = (mode: "always" | "demand" | "never") => void;

export const renderControl: {
  setFrameloop: FrameloopSetter | null;
  active: boolean;
} = {
  setFrameloop: null,
  active: true,
};

export function setSceneActive(active: boolean) {
  if (renderControl.active === active) return;
  renderControl.active = active;
  renderControl.setFrameloop?.(active ? "always" : "never");
}
