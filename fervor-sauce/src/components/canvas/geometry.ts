import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural, physically-plausible jar. Everything is built from lathe
 * profiles so the silhouette has real wall thickness, a thick punted base,
 * thread rings and a rolled lip — which is what makes the refraction and
 * edge highlights read as glass.
 *
 * Profile rule (LatheGeometry): the surface's outside is on the right-hand
 * side when walking along the profile.
 */

export const JAR = {
  R: 0.86,
  innerR: 0.805,
  bottom: -1.0,
  innerBottom: -0.835,
  shoulder: 0.56,
  neckR: 0.7,
  neckInnerR: 0.65,
  neckBottom: 0.84,
  rim: 1.1,
  fill: 0.5,
  label: { y: -0.115, h: 1.02, r: 0.869, gap: 0.36 },
  lid: { r: 0.778, innerR: 0.745, h: 0.3, closedY: 0.835 },
} as const;

/** Circumference of the label arc / its height — the canvas must match. */
export const LABEL_ASPECT = (JAR.label.r * (Math.PI * 2 - JAR.label.gap)) / JAR.label.h;

type V = THREE.Vector2;

class Profile {
  pts: V[] = [];
  push(x: number, y: number) {
    const last = this.pts[this.pts.length - 1];
    if (last && Math.hypot(last.x - x, last.y - y) < 1e-4) return this;
    this.pts.push(new THREE.Vector2(Math.max(0, x), y));
    return this;
  }
  line(x: number, y: number, steps = 1) {
    const a = this.pts[this.pts.length - 1];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.push(a.x + (x - a.x) * t, a.y + (y - a.y) * t);
    }
    return this;
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, steps = 10) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      this.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    return this;
  }
  bezier(p1: [number, number], p2: [number, number], p3: [number, number], steps = 16) {
    const p0 = this.pts[this.pts.length - 1];
    const c = new THREE.CubicBezierCurve(
      p0.clone(),
      new THREE.Vector2(...p1),
      new THREE.Vector2(...p2),
      new THREE.Vector2(...p3),
    );
    for (let i = 1; i <= steps; i++) {
      const p = c.getPoint(i / steps);
      this.push(p.x, p.y);
    }
    return this;
  }
}

const D90 = Math.PI / 2;

export function createGlassGeometry(segments = 128) {
  const { R, innerR, bottom, innerBottom, shoulder, neckR, neckInnerR, neckBottom, rim } = JAR;
  const p = new Profile();
  // outer base (slight punt) → rounded heel
  p.push(0, bottom + 0.018).line(0.4, bottom + 0.004, 4).line(R - 0.16, bottom, 3);
  p.arc(R - 0.16, bottom + 0.16, 0.16, -D90, 0, 12);
  // straight wall
  p.line(R, shoulder, 14);
  // shoulder
  p.bezier([R, shoulder + 0.17], [neckR + 0.02, neckBottom - 0.07], [neckR, neckBottom], 18);
  // neck with two thread rings
  const thread = (y0: number) => {
    p.line(neckR, y0, 1);
    p.bezier([neckR + 0.03, y0 + 0.008], [neckR + 0.03, y0 + 0.032], [neckR, y0 + 0.04], 6);
  };
  thread(neckBottom + 0.045);
  thread(neckBottom + 0.13);
  p.line(neckR, rim - 0.025, 2);
  // rolled lip
  const lipR = (neckR - neckInnerR) / 2;
  p.arc(neckInnerR + lipR, rim - lipR, lipR, 0, Math.PI, 12);
  // inner neck → inner shoulder → inner wall
  p.line(neckInnerR, neckBottom + 0.02, 6);
  p.bezier([neckInnerR + 0.015, neckBottom - 0.06], [innerR, shoulder + 0.2], [innerR, shoulder], 18);
  p.line(innerR, innerBottom + 0.12, 14);
  p.arc(innerR - 0.12, innerBottom + 0.12, 0.12, 0, -D90, 10);
  p.line(0, innerBottom + 0.01, 4);
  const g = new THREE.LatheGeometry(p.pts, segments);
  g.computeBoundingSphere();
  return g;
}

export function createSauceGeometry(segments = 96) {
  const { innerR, innerBottom, fill } = JAR;
  const r = innerR - 0.006;
  const p = new Profile();
  p.push(0, innerBottom + 0.014).line(r - 0.114, innerBottom + 0.006, 4);
  p.arc(r - 0.114, innerBottom + 0.12, 0.114, -D90, 0, 10);
  p.line(r, fill + 0.012, 12);
  // meniscus: the sauce climbs the wall a touch
  p.bezier([r - 0.012, fill + 0.004], [r - 0.05, fill - 0.004], [r - 0.09, fill - 0.006], 8);
  p.line(0, fill - 0.012, 6);
  return new THREE.LatheGeometry(p.pts, segments);
}

export function createLabelGeometry(segments = 160) {
  const { r, h, gap } = JAR.label;
  return new THREE.CylinderGeometry(
    r,
    r,
    h,
    segments,
    1,
    true,
    Math.PI + gap / 2,
    Math.PI * 2 - gap,
  );
}

/** Black steel lid with a knurled skirt, built as one lathe. */
export function createLidGeometry(segments = 288) {
  const { r, innerR, h } = JAR.lid;
  const p = new Profile();
  // underside of the top → inner skirt (faces inward / down)
  p.push(0, h - 0.03).line(innerR, h - 0.032, 6);
  p.line(innerR, 0.03, 8);
  // rolled bottom edge
  const br = (r - innerR) / 2;
  p.arc(innerR + br, 0.03, br, Math.PI, Math.PI * 2, 10);
  // outer skirt (knurled later)
  p.line(r, h - 0.065, 24);
  // rounded top edge → domed top
  p.arc(r - 0.06, h - 0.065, 0.06, 0, D90, 12);
  p.line(0.3, h + 0.004, 4).line(0, h + 0.008, 4);

  let g: THREE.BufferGeometry = new THREE.LatheGeometry(p.pts, segments);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g, 1e-5);

  // Knurling: displace outer skirt vertices into fine vertical ridges.
  const pos = g.attributes.position as THREE.BufferAttribute;
  const ridges = 72;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rad = Math.hypot(v.x, v.z);
    if (Math.abs(rad - r) > 0.003) continue;
    const y = v.y;
    const band = THREE.MathUtils.smoothstep(y, 0.05, 0.075) * (1 - THREE.MathUtils.smoothstep(y, 0.19, 0.215));
    if (band <= 0) continue;
    const theta = Math.atan2(v.x, v.z);
    const ridge = Math.pow(0.5 + 0.5 * Math.cos(theta * ridges), 0.6);
    const nr = rad + (ridge - 0.5) * 0.012 * band;
    v.x *= nr / rad;
    v.z *= nr / rad;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function createLidTopGeometry() {
  const g = new THREE.CircleGeometry(JAR.lid.r - 0.085, 96);
  g.rotateX(-Math.PI / 2);
  g.translate(0, JAR.lid.h + 0.0105, 0);
  return g;
}
