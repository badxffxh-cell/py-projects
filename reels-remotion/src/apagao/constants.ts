// Instagram Reels / TikTok safe zone (px). Nothing important outside of it.
export const SAFE = { top: 250, bottom: 350, left: 90, right: 150 };
export const W = 1080;
export const H = 1920;
export const SAFE_W = W - SAFE.left - SAFE.right; // 840
export const SAFE_H = H - SAFE.top - SAFE.bottom; // 1320

export const FONT = "Poppins, sans-serif";
export const ACCENT = "#FFB300"; // amarelo/laranja da palavra atual
export const ALERT = "#FF5A36";

export type Word = { text: string; start: number; end: number };
export type CaptionPage = { start: number; end: number; words: Word[] };
export type Marco = { t: number; clock: string; level: number };
export type Shot = {
  id: string;
  art: string | null;
  t: number;
  end: number;
  in: "cut" | "whip" | "zoom" | "match";
  focus: [number, number, number, number]; // fx, fy, zoom start, zoom end
  label?: { t: number; text: string };
  artT?: number;
};
export type Timeline = {
  fps: number;
  duration: number;
  frames: number;
  blackout: number;
  marcos: Marco[];
  shots: Shot[];
  captions: CaptionPage[];
};
