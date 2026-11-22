import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pointer, scroll } from "@/lib/sceneState";
import { damp } from "@/lib/utils";
import { rangeRng } from "@/lib/random";
import { jarWorld } from "./quality";

/**
 * Floating chili flakes, peppercorns, seeds and salt crystals orbiting the
 * jar. One InstancedMesh per spice type; orbit, bob, tumble, scroll-swirl
 * and a soft cursor repulsion are all integrated on the CPU (a few hundred
 * matrices per frame).
 */

type SpiceDef = {
  key: string;
  count: number;
  geometry: () => THREE.BufferGeometry;
  size: [number, number];
  squash: [number, number, number];
  colors: string[];
  material: THREE.MeshStandardMaterialParameters;
};

function wrinkledSphere() {
  const g = new THREE.SphereGeometry(1, 14, 10);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      Math.sin(v.x * 9.1 + v.y * 4.3) * 0.5 +
      Math.sin(v.y * 11.7 - v.z * 6.1) * 0.35 +
      Math.sin(v.z * 13.3 + v.x * 5.2) * 0.25;
    v.multiplyScalar(1 + n * 0.06);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function chiliFlake() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // deterministic jitter keyed on position so shared vertices stay welded
    const j = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    const n = j - Math.floor(j);
    v.x *= 0.75 + n * 0.5;
    v.z *= 0.6 + (1 - n) * 0.55;
    v.y = v.y * 0.07 + Math.sin(v.x * 3.1) * 0.06;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const DEFS: SpiceDef[] = [
  {
    key: "flake",
    count: 72,
    geometry: chiliFlake,
    size: [0.05, 0.13],
    squash: [1, 1, 1],
    colors: ["#a3220a", "#8a1b06", "#c73510", "#6b1404", "#b42c0b", "#d8431a"],
    material: { roughness: 0.42, metalness: 0, flatShading: true, side: THREE.DoubleSide },
  },
  {
    key: "pepper",
    count: 34,
    geometry: wrinkledSphere,
    size: [0.045, 0.072],
    squash: [1, 1, 1],
    colors: ["#2a1a12", "#3b2419", "#1c120d", "#4a2c1c"],
    material: { roughness: 0.72, metalness: 0 },
  },
  {
    key: "seed",
    count: 64,
    geometry: () => new THREE.SphereGeometry(1, 12, 8),
    size: [0.028, 0.05],
    squash: [1, 0.36, 0.7],
    colors: ["#ecd3a2", "#f4e2bd", "#d9bb8b", "#f6d9a0"],
    material: { roughness: 0.48, metalness: 0 },
  },
  {
    key: "salt",
    count: 26,
    geometry: () => new THREE.BoxGeometry(1, 1, 1),
    size: [0.024, 0.044],
    squash: [1, 0.85, 1.15],
    colors: ["#f6f1ea", "#ffffff", "#efe6da"],
    material: { roughness: 0.18, metalness: 0, transparent: false },
  },
];

interface Particle {
  r0: number;
  theta0: number;
  y0: number;
  omega: number;
  bobA: number;
  bobF: number;
  phase: number;
  axis: THREE.Vector3;
  spinSpeed: number;
  size: number;
  spreadMul: number;
  sx: number;
  sz: number;
  ox: number;
  oy: number;
}

function SpiceType({ def, density }: { def: SpiceDef; density: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(6, Math.round(def.count * density));
  const geometry = useMemo(() => def.geometry(), [def]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", ...def.material }), [def]);

  const particles = useMemo<Particle[]>(() => {
    const rand = rangeRng(def.key.length * 7919 + count);
    return Array.from({ length: count }, () => ({
        r0: rand(1.3, 3.3),
        theta0: rand(0, Math.PI * 2),
        y0: rand(-1.7, 2.1),
        omega: rand(0.05, 0.2) * (rand() > 0.3 ? 1 : -1),
        bobA: rand(0.04, 0.14),
        bobF: rand(0.35, 1.1),
        phase: rand(0, Math.PI * 2),
        axis: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(),
        spinSpeed: rand(0.3, 1.5),
        size: rand(def.size[0], def.size[1]),
        spreadMul: rand(0.5, 1.6),
        sx: rand(0.7, 1.35),
        sz: rand(0.6, 1.2),
        ox: 0,
        oy: 0,
      }));
  }, [count, def.size, def.key]);

  useLayoutEffect(() => {
    const m = mesh.current!;
    const c = new THREE.Color();
    particles.forEach((_, i) => m.setColorAt(i, c.set(def.colors[i % def.colors.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [particles, def.colors]);

  useLayoutEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      swirl: 0,
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 1 / 20);
    const vis = jarWorld.visible;
    m.visible = vis > 0.02;
    if (!m.visible) return;
    const t = state.clock.elapsedTime;
    const { width: vw, height: vh } = state.viewport;
    const px = pointer.x * vw * 0.5;
    const py = pointer.y * vh * 0.5;
    tmp.swirl += THREE.MathUtils.clamp(scroll.velocity, -80, 80) * 0.00035;
    const spread = jarWorld.spread;
    const js = jarWorld.scale * 0.82;

    for (let i = 0; i < particles.length; i++) {
      const P = particles[i];
      const sMul = 1 + spread * 1.05 * P.spreadMul;
      const r = P.r0 * sMul;
      const th = P.theta0 + P.omega * t + tmp.swirl * (0.6 + P.spreadMul * 0.4);
      let x = Math.cos(th) * r;
      const z = Math.sin(th) * r * 0.6;
      let y = P.y0 * (1 + spread * 0.5) + Math.sin(t * P.bobF + P.phase) * P.bobA;
      x = jarWorld.x + x * js;
      y = jarWorld.y + y * js;

      // cursor repulsion (in the z = 0 plane, good enough at this depth range)
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy) + 1e-4;
      const R = 0.85;
      const f = pointer.moved && d < R ? Math.pow(1 - d / R, 2) * 0.55 : 0;
      P.ox = damp(P.ox, (dx / d) * f, 3.2, dt);
      P.oy = damp(P.oy, (dy / d) * f, 3.2, dt);

      tmp.p.set(x + P.ox, y + P.oy, z * js);
      tmp.q.setFromAxisAngle(P.axis, t * P.spinSpeed + P.phase);
      const sz = P.size * (0.6 + 0.4 * vis) * (1.15 + 0.15 * spread) * js;
      tmp.s.set(sz * def.squash[0] * P.sx, sz * def.squash[1], sz * def.squash[2] * P.sz);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      m.setMatrixAt(i, tmp.m);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      frustumCulled={false}
      onUpdate={(self) => self.instanceMatrix.setUsage(THREE.DynamicDrawUsage)}
    />
  );
}

export function Spices({ density = 1 }: { density?: number }) {
  return (
    <group>
      {DEFS.map((d) => (
        <SpiceType key={d.key} def={d} density={density} />
      ))}
    </group>
  );
}
