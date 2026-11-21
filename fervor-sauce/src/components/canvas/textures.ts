import * as THREE from "three";
import type { Flavor } from "@/lib/products";
import { mulberry32 } from "@/lib/random";
import { LABEL_ASPECT } from "./geometry";

/* ------------------------------------------------------------------ */
/* Fonts                                                                */
/* ------------------------------------------------------------------ */

export interface FontSet {
  display: string;
  serif: string;
  sans: string;
  mono: string;
}

export function readFonts(): FontSet {
  const cs = getComputedStyle(document.documentElement);
  const get = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  return {
    display: get("--font-anton", "Impact, sans-serif"),
    serif: get("--font-instrument", "Georgia, serif"),
    sans: get("--font-inter", "Arial, sans-serif"),
    mono: get("--font-jetbrains", "monospace"),
  };
}

export async function loadFonts(f: FontSet) {
  if (!("fonts" in document)) return;
  const specs = [
    `400 120px ${f.display}`,
    `italic 400 120px ${f.serif}`,
    `400 120px ${f.serif}`,
    `500 40px ${f.mono}`,
    `600 40px ${f.sans}`,
  ];
  await Promise.race([
    Promise.all(specs.map((s) => document.fonts.load(s).catch(() => null))),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const FLAME =
  "M12 1.2c.9 3.2-.5 5.4-2.3 7.3C7.9 10.4 6 12.6 6 15.7c0 3.8 2.7 6.9 6 6.9s6-3.1 6-6.8c0-3-1.4-5.1-2.9-6.7-.3 1.8-1.2 3-2.5 3.6.6-4-.1-8.3-.6-10.5z";
const flamePath = typeof Path2D !== "undefined" ? new Path2D(FLAME) : null;

function luminance(hex: string) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

type G = CanvasRenderingContext2D;

function tracked(
  g: G,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: "left" | "center" | "right" = "center",
) {
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = g.textAlign;
  g.textAlign = "left";
  chars.forEach((ch, i) => {
    g.fillText(ch, cx, y);
    cx += widths[i] + tracking;
  });
  g.textAlign = prev;
  return total;
}

function drawFlame(g: G, cx: number, cy: number, size: number, mode: "fill" | "stroke" = "fill") {
  if (!flamePath) return;
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(size / 24, size / 24);
  if (mode === "fill") g.fill(flamePath);
  else {
    g.lineWidth = 1.6;
    g.stroke(flamePath);
  }
  g.restore();
}

function circleText(g: G, text: string, cx: number, cy: number, r: number, startAngle = -Math.PI / 2) {
  const chars = [...text];
  const widths = chars.map((c) => g.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  const spacing = (Math.PI * 2 * r - total) / chars.length;
  let a = startAngle;
  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  chars.forEach((ch, i) => {
    const w = widths[i];
    a += (w / 2 + spacing / 2) / r;
    g.save();
    g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
    a += (w / 2 + spacing / 2) / r;
  });
  g.restore();
}

function wrapText(g: G, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function paperGrain(g: G, W: number, H: number, dark: boolean, seed: number) {
  const rnd = mulberry32(seed);
  const n = Math.floor((W * H) / 110);
  for (let i = 0; i < n; i++) {
    const light = rnd() > 0.5;
    const a = 0.02 + rnd() * (dark ? 0.05 : 0.06);
    g.fillStyle = light ? `rgba(255,248,235,${a})` : `rgba(20,10,5,${a})`;
    const s = rnd() > 0.92 ? 2 : 1;
    g.fillRect(rnd() * W, rnd() * H, s, s);
  }
  // long paper fibres
  g.lineWidth = 0.6;
  for (let i = 0; i < W / 6; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = 6 + rnd() * 22;
    const ang = rnd() * Math.PI;
    g.strokeStyle = dark ? `rgba(255,240,220,${0.025 + rnd() * 0.03})` : `rgba(60,30,10,${0.03 + rnd() * 0.04})`;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
}

function canvasTexture(canvas: HTMLCanvasElement, srgb: boolean, aniso: number) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

/* ORM = (R: occlusion, G: roughness, B: metalness) */
const ORM_PAPER = "rgb(255,205,0)";
const ORM_INK = "rgb(255,160,0)";
const ORM_FOIL = "rgb(255,58,255)";

export interface PBRTextures {
  map: THREE.CanvasTexture;
  orm: THREE.CanvasTexture;
}

/* ------------------------------------------------------------------ */
/* Label                                                                */
/* ------------------------------------------------------------------ */

export function createLabelTextures(flavor: Flavor, fonts: FontSet, width: number, aniso: number): PBRTextures {
  const W = width;
  const H = Math.round(W / LABEL_ASPECT);
  const color = document.createElement("canvas");
  const orm = document.createElement("canvas");
  color.width = orm.width = W;
  color.height = orm.height = H;
  const c = color.getContext("2d")!;
  const o = orm.getContext("2d")!;
  const k = H / 600;
  const C = flavor.colors;
  const dark = luminance(C.labelBg) < 0.25;
  const rnd = mulberry32(flavor.index * 977 + 13);

  c.fillStyle = C.labelBg;
  c.fillRect(0, 0, W, H);
  paperGrain(c, W, H, dark, flavor.index * 31 + 7);
  o.fillStyle = ORM_PAPER;
  o.fillRect(0, 0, W, H);

  type Kind = "foil" | "ink" | "muted";
  const layer = (kind: Kind, draw: (g: G) => void) => {
    const col = kind === "foil" ? C.foil : kind === "ink" ? C.labelInk : C.labelMuted;
    const om = kind === "foil" ? ORM_FOIL : ORM_INK;
    for (const [g, fill] of [
      [c, col],
      [o, om],
    ] as const) {
      g.save();
      g.fillStyle = fill;
      g.strokeStyle = fill;
      g.textBaseline = "alphabetic";
      draw(g);
      g.restore();
    }
  };
  const font = (g: G, spec: string) => (g.font = spec);

  const cx = W * 0.5;
  const left = W * 0.25;
  const right = W * 0.75;
  const backL = W * 0.07;
  const backR = W * 0.93;

  /* Wrap-around foil rules */
  layer("foil", (g) => {
    g.fillRect(0, 26 * k, W, 3.2 * k);
    g.fillRect(0, 36 * k, W, 1.2 * k);
    g.fillRect(0, H - 29.2 * k, W, 3.2 * k);
    g.fillRect(0, H - 37.2 * k, W, 1.2 * k);
  });

  /* Repeating micro-type band */
  layer("muted", (g) => {
    font(g, `500 ${13 * k}px ${fonts.mono}`);
    const phrase = "SMALL BATCH  ✦  FIRE SAUCE  ✦  HAND-NUMBERED  ✦  CHARRED OVER WHITE OAK  ✦  ";
    let x = 0;
    while (x < W) x += tracked(g, phrase, x, 58 * k, 2.4 * k, "left") + 2.4 * k;
  });

  /* Panel dividers */
  layer("foil", (g) => {
    for (const fx of [0.14, 0.36, 0.64, 0.86]) {
      const x = W * fx;
      g.fillRect(x - 0.8 * k, 92 * k, 1.6 * k, H - 184 * k);
      g.save();
      g.translate(x, H / 2);
      g.rotate(Math.PI / 4);
      g.fillRect(-5 * k, -5 * k, 10 * k, 10 * k);
      g.restore();
    }
  });

  /* ---------------- Front panel ---------------- */
  layer("muted", (g) => {
    font(g, `500 ${17 * k}px ${fonts.mono}`);
    tracked(g, "EST. MMXIX", cx, 118 * k, 6 * k);
  });
  layer("foil", (g) => {
    g.fillRect(cx - 190 * k, 112 * k, 92 * k, 1.4 * k);
    g.fillRect(cx + 98 * k, 112 * k, 92 * k, 1.4 * k);
  });

  // Wordmark
  layer("foil", (g) => {
    font(g, `400 100px ${fonts.display}`);
    const m = g.measureText("FERVOR");
    const cap = m.actualBoundingBoxAscent || 73;
    const size = (100 * 168 * k) / cap;
    font(g, `400 ${size}px ${fonts.display}`);
    tracked(g, "FERVOR", cx, 312 * k, 6 * k);
  });

  // Rule with flame
  layer("foil", (g) => {
    g.fillRect(cx - 250 * k, 344 * k, 214 * k, 1.6 * k);
    g.fillRect(cx + 36 * k, 344 * k, 214 * k, 1.6 * k);
    drawFlame(g, cx, 344 * k, 30 * k);
  });

  // Flavor name
  layer("ink", (g) => {
    font(g, `italic 400 ${138 * k}px ${fonts.serif}`);
    g.textAlign = "center";
    g.fillText(flavor.name, cx, 462 * k);
  });

  // Descriptor
  layer("ink", (g) => {
    font(g, `600 ${19 * k}px ${fonts.sans}`);
    tracked(g, flavor.descriptor.toUpperCase(), cx, 506 * k, 4.2 * k);
  });

  // Heat pips
  const pip = 26 * k;
  const pipGap = 10 * k;
  const pipsW = 5 * pip + 4 * pipGap;
  for (let i = 0; i < 5; i++) {
    const x = cx - pipsW / 2 + pip / 2 + i * (pip + pipGap);
    if (i < flavor.heat) layer("foil", (g) => drawFlame(g, x, 540 * k, pip));
    else layer("muted", (g) => drawFlame(g, x, 540 * k, pip, "stroke"));
  }

  /* ---------------- Left panel: batch ---------------- */
  layer("muted", (g) => {
    font(g, `500 ${16 * k}px ${fonts.mono}`);
    tracked(g, "BATCH", left, 132 * k, 8 * k);
  });
  layer("ink", (g) => {
    font(g, `400 ${132 * k}px ${fonts.display}`);
    tracked(g, `Nº${flavor.batch}`, left, 268 * k, 2 * k);
  });
  layer("muted", (g) => {
    font(g, `500 ${13 * k}px ${fonts.mono}`);
    tracked(g, "HAND-NUMBERED · 1 OF 300", left, 300 * k, 3 * k);
  });
  // stamp
  layer("foil", (g) => {
    g.lineWidth = 2.2 * k;
    g.beginPath();
    g.arc(left, 420 * k, 82 * k, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1 * k;
    g.beginPath();
    g.arc(left, 420 * k, 56 * k, 0, Math.PI * 2);
    g.stroke();
    drawFlame(g, left, 418 * k, 50 * k);
  });
  layer("ink", (g) => {
    font(g, `500 ${14 * k}px ${fonts.mono}`);
    circleText(g, "FERMENTED ✦ THIRTY DAYS ✦ OPEN CROCK ✦ ", left, 420 * k, 69 * k);
  });

  /* ---------------- Right panel: heat ---------------- */
  layer("muted", (g) => {
    font(g, `500 ${16 * k}px ${fonts.mono}`);
    tracked(g, "SCOVILLE", right, 132 * k, 8 * k);
  });
  layer("ink", (g) => {
    font(g, `400 ${112 * k}px ${fonts.display}`);
    tracked(g, flavor.scoville.toLocaleString("en-US"), right, 252 * k, 3 * k);
  });
  layer("muted", (g) => {
    font(g, `500 ${13 * k}px ${fonts.mono}`);
    tracked(g, "HEAT UNITS (APPROX.)", right, 284 * k, 3 * k);
  });
  for (let i = 0; i < 5; i++) {
    const bw = 44 * k;
    const x = right - (5 * bw + 4 * 6 * k) / 2 + i * (bw + 6 * k);
    layer(i < flavor.heat ? "foil" : "muted", (g) => g.fillRect(x, 304 * k, bw, 9 * k));
  }
  layer("muted", (g) => {
    font(g, `500 ${14 * k}px ${fonts.mono}`);
    tracked(g, "PAIRS WITH", right, 372 * k, 6 * k);
  });
  layer("ink", (g) => {
    font(g, `italic 400 ${40 * k}px ${fonts.serif}`);
    g.textAlign = "center";
    flavor.pairings.forEach((p, i) => g.fillText(p, right, (424 + i * 46) * k));
  });

  /* ---------------- Back left: ingredients ---------------- */
  layer("muted", (g) => {
    font(g, `500 ${14 * k}px ${fonts.mono}`);
    tracked(g, "INGREDIENTS", backL, 124 * k, 5 * k);
  });
  layer("ink", (g) => {
    font(g, `500 ${16 * k}px ${fonts.sans}`);
    g.textAlign = "center";
    const lines = wrapText(g, flavor.ingredients.toUpperCase(), W * 0.11);
    lines.forEach((l, i) => g.fillText(l, backL, (164 + i * 25) * k));
  });
  layer("muted", (g) => {
    font(g, `500 ${12 * k}px ${fonts.mono}`);
    g.textAlign = "center";
    ["KEEP REFRIGERATED", "AFTER OPENING.", "SHAKE LIKE YOU", "MEAN IT."].forEach((l, i) =>
      g.fillText(l, backL, (462 + i * 20) * k),
    );
  });

  /* ---------------- Back right: barcode ---------------- */
  layer("ink", (g) => {
    const bx = backR - 92 * k;
    let x = bx;
    while (x < backR + 92 * k) {
      const w = (1 + Math.floor(rnd() * 3.2)) * 1.7 * k;
      if (rnd() > 0.35) g.fillRect(x, 150 * k, w, 150 * k);
      x += w + 1.7 * k;
    }
    font(g, `500 ${14 * k}px ${fonts.mono}`);
    tracked(g, `8 50027 ${flavor.batch}91 ${flavor.index}4`, backR, 326 * k, 3 * k);
  });
  layer("foil", (g) => drawFlame(g, backR, 404 * k, 54 * k));
  layer("muted", (g) => {
    font(g, `500 ${12 * k}px ${fonts.mono}`);
    g.textAlign = "center";
    ["MADE BY HAND", "IN SMALL BATCHES", `8 FL OZ · 237 mL`].forEach((l, i) =>
      g.fillText(l, backR, (470 + i * 20) * k),
    );
  });

  return { map: canvasTexture(color, true, aniso), orm: canvasTexture(orm, false, aniso) };
}

/* ------------------------------------------------------------------ */
/* Lid top: spun black steel with a foil seal                           */
/* ------------------------------------------------------------------ */

export function createLidTextures(fonts: FontSet, size: number, aniso: number): PBRTextures {
  const S = size;
  const color = document.createElement("canvas");
  const orm = document.createElement("canvas");
  color.width = color.height = orm.width = orm.height = S;
  const c = color.getContext("2d")!;
  const o = orm.getContext("2d")!;
  const m = S / 1024;
  const cx = S / 2;
  const rnd = mulberry32(404);

  const bg = c.createRadialGradient(cx, cx, 0, cx, cx, cx);
  bg.addColorStop(0, "#1b1716");
  bg.addColorStop(1, "#0d0b0a");
  c.fillStyle = bg;
  c.fillRect(0, 0, S, S);
  o.fillStyle = "rgb(255,120,255)";
  o.fillRect(0, 0, S, S);

  // spun-metal concentric grooves
  for (let r = 4; r < cx; r += 1.6 * m) {
    const a = rnd();
    c.strokeStyle = `rgba(255,240,230,${0.012 + a * 0.035})`;
    c.lineWidth = 0.8 * m;
    c.beginPath();
    c.arc(cx, cx, r, 0, Math.PI * 2);
    c.stroke();
    o.strokeStyle = `rgb(255,${95 + Math.floor(a * 60)},255)`;
    o.lineWidth = 1.2 * m;
    o.beginPath();
    o.arc(cx, cx, r, 0, Math.PI * 2);
    o.stroke();
  }

  const foil = (draw: (g: G) => void) => {
    for (const [g, fill] of [
      [c, "#ff6a24"],
      [o, "rgb(255,48,255)"],
    ] as const) {
      g.save();
      g.fillStyle = fill;
      g.strokeStyle = fill;
      draw(g);
      g.restore();
    }
  };

  foil((g) => {
    g.lineWidth = 5 * m;
    g.beginPath();
    g.arc(cx, cx, 478 * m, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2 * m;
    g.beginPath();
    g.arc(cx, cx, 330 * m, 0, Math.PI * 2);
    g.stroke();
    g.font = `500 ${34 * m}px ${fonts.mono}`;
    circleText(g, "FERVOR ✦ SMALL BATCH FIRE SAUCE ✦ CHARRED · FERMENTED · JARRED BY HAND ✦ ", cx, cx, 405 * m);
    drawFlame(g, cx, cx - 30 * m, 300 * m);
    g.font = `400 ${86 * m}px ${fonts.display}`;
    g.textAlign = "center";
    g.fillText("FERVOR", cx, cx + 210 * m);
  });

  return { map: canvasTexture(color, true, aniso), orm: canvasTexture(orm, false, aniso) };
}

/* ------------------------------------------------------------------ */
/* Giant wordmark behind the hero jar                                   */
/* ------------------------------------------------------------------ */

export function createWordmarkTexture(text: string, fonts: FontSet, width: number) {
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d")!;
  g.font = `400 200px ${fonts.display}`;
  const m = g.measureText(text);
  const asc = m.actualBoundingBoxAscent || 150;
  const desc = m.actualBoundingBoxDescent || 0;
  const scale = (width * 0.985) / m.width;
  const size = 200 * scale;
  const h = Math.ceil((asc + desc) * scale * 1.08);
  canvas.width = width;
  canvas.height = h;
  g.font = `400 ${size}px ${fonts.display}`;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#ff7a2c");
  grad.addColorStop(0.55, "#ff5b1f");
  grad.addColorStop(1, "#c9330a");
  g.fillStyle = grad;
  g.fillText(text, width / 2, h - (h - (asc + desc) * scale) / 2 - desc * scale);

  // print texture: knock tiny holes into the ink
  g.globalCompositeOperation = "destination-out";
  const rnd = mulberry32(99);
  for (let i = 0; i < (width * h) / 220; i++) {
    g.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.35})`;
    g.fillRect(rnd() * width, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  g.globalCompositeOperation = "source-over";

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return { texture: t, aspect: width / h };
}
