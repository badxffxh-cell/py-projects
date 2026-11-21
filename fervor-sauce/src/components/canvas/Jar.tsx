"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FLAVORS } from "@/lib/products";
import { useUI } from "@/lib/store";
import { composePose, POSE_KEYS, POSES, type JarPose } from "@/lib/choreography";
import { drag, impulses, intro, jarRect, pointer, scroll } from "@/lib/sceneState";
import { damp } from "@/lib/utils";
import {
  JAR,
  createGlassGeometry,
  createLabelGeometry,
  createLidGeometry,
  createLidTopGeometry,
  createSauceGeometry,
} from "./geometry";
import {
  applyBurnPatch,
  applySaucePatch,
  createBurnUniforms,
  createSauceUniforms,
  glowFragment,
  glowVertex,
} from "./shaders";
import { createLabelTextures, createLidTextures, loadFonts, readFonts, type PBRTextures } from "./textures";
import { Steam } from "./Steam";
import { jarWorld, type Quality } from "./quality";

const TAU = Math.PI * 2;
const BASE_SCALE = 1.22;
const FLAVOR_INDEX = Object.fromEntries(FLAVORS.map((f) => [f.id, f.index])) as Record<string, number>;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface JarProps {
  quality: Quality;
  onReady: () => void;
}

export function Jar({ quality, onReady }: JarProps) {
  const gl = useThree((s) => s.gl);

  /* ---------------- geometry ---------------- */
  const geo = useMemo(
    () => ({
      glass: createGlassGeometry(quality.tier === "high" ? 160 : 112),
      sauce: createSauceGeometry(quality.tier === "high" ? 112 : 80),
      label: createLabelGeometry(quality.tier === "high" ? 192 : 128),
      lid: createLidGeometry(quality.tier === "high" ? 288 : 216),
      lidTop: createLidTopGeometry(),
      plane: new THREE.PlaneGeometry(1, 1),
    }),
    [quality.tier],
  );

  /* ---------------- materials ---------------- */
  const burn = useMemo(() => createBurnUniforms(), []);
  const sauceU = useMemo(() => createSauceUniforms(), []);

  const mats = useMemo(() => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      thickness: 0.35,
      ior: 1.5,
      dispersion: quality.tier === "high" ? 0.35 : 0,
      attenuationColor: new THREE.Color("#efe9dc"),
      attenuationDistance: 2.4,
      specularIntensity: 1,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });

    const sauce = new THREE.MeshPhysicalMaterial({
      roughness: 0.22,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.1,
    });
    applySaucePatch(sauce, sauceU);

    const label = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 1,
      metalness: 1,
      envMapIntensity: 1.25,
    });
    applyBurnPatch(label, burn);

    const lid = new THREE.MeshPhysicalMaterial({
      color: "#16110f",
      metalness: 0.88,
      roughness: 0.3,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    });

    const lidTop = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 1,
      metalness: 1,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      envMapIntensity: 1.2,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });

    const shadow = new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: {
        uColor: { value: new THREE.Color("#000000") },
        uOpacity: { value: 0.55 },
        uPower: { value: 1.8 },
      },
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
    });

    return { glass, sauce, label, lid, lidTop, shadow };
  }, [burn, sauceU, quality.tier]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  /* ---------------- textures (async: wait for webfonts) ---------------- */
  const [labels, setLabels] = useState<PBRTextures[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const created: PBRTextures[] = [];
    (async () => {
      const fonts = readFonts();
      await loadFonts(fonts);
      if (cancelled) return;
      const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
      const lidTex = createLidTextures(fonts, quality.tier === "high" ? 1024 : 512, aniso);
      created.push(lidTex);
      const out: PBRTextures[] = [];
      for (const f of FLAVORS) {
        out.push(createLabelTextures(f, fonts, quality.labelWidth, aniso));
        // yield between flavours to keep the main thread responsive
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
      }
      created.push(...out);
      out.forEach((t) => {
        gl.initTexture(t.map);
        gl.initTexture(t.orm);
      });
      mats.lidTop.map = lidTex.map;
      mats.lidTop.roughnessMap = lidTex.orm;
      mats.lidTop.metalnessMap = lidTex.orm;
      mats.lidTop.needsUpdate = true;
      setLabels(out);
    })();
    return () => {
      cancelled = true;
      created.forEach((t) => {
        t.map.dispose();
        t.orm.dispose();
      });
    };
  }, [gl, mats, quality.labelWidth, quality.tier]);

  // Apply the initial label once textures exist.
  const labelState = useRef({ current: 0, to: 0, p: 0, active: false });
  useEffect(() => {
    if (!labels) return;
    const idx = FLAVOR_INDEX[useUI.getState().jarFlavor] ?? 0;
    labelState.current = { current: idx, to: idx, p: 0, active: false };
    const t = labels[idx];
    mats.label.map = t.map;
    mats.label.roughnessMap = t.orm;
    mats.label.metalnessMap = t.orm;
    burn.uMapB.value = t.map;
    burn.uOrmB.value = t.orm;
    burn.uProgress.value = 0;
    mats.label.needsUpdate = true;
    const f = FLAVORS[idx].colors;
    sauceU.uSauce.value.set(f.sauce);
    sauceU.uDeep.value.set(f.sauceDeep);
    sauceU.uSeed.value.set(f.seed);
  }, [labels, mats, burn, sauceU]);

  /* ---------------- refs + per-frame state ---------------- */
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const lidTilt = useRef<THREE.Group>(null);
  const lidSpin = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);

  const sim = useRef({
    pose: { ...POSES.desktop.hero } as JarPose,
    target: { ...POSES.desktop.hero } as JarPose,
    angle: -0.35,
    angVel: 0,
    lidSpin: 0,
    spinAnim: { t: 1, from: 0 },
    frames: 0,
    readySent: false,
    first: true,
  });
  const steamIntensity = useRef(0);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), c: new THREE.Color(), d: new THREE.Color(), s: new THREE.Color() }), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const S = sim.current;
    const { camera, size } = state;
    const vp = state.viewport.getCurrentViewport(camera, tmp.v.set(0, 0, 0));
    const layout = size.width / size.height < 0.85 ? "mobile" : "desktop";

    /* --- pose from scroll --- */
    composePose(S.target, layout);
    for (const k of POSE_KEYS) {
      const lambda = k === "lid" ? 3.4 : k === "visible" ? 6 : 4.6;
      S.pose[k] = S.first ? S.target[k] : damp(S.pose[k], S.target[k], lambda, dt);
    }
    S.first = false;
    const P = S.pose;

    const r = root.current!;
    const sc = P.scale * BASE_SCALE * (layout === "mobile" ? 1 : Math.min(1.08, Math.max(0.86, vp.width / vp.height / 1.7)));
    const float = Math.sin(t * 1.05) * 0.045 * (0.6 + 0.4 * P.lid);
    const ie = 1 - Math.pow(1 - intro.jar, 3);
    r.position.set(P.x * vp.width, P.y * vp.height + float - (1 - ie) * 1.6, 0);
    r.scale.setScalar(sc * (0.92 + 0.08 * P.visible) * (0.78 + 0.22 * ie));
    r.visible = P.visible > 0.015;

    jarWorld.x = r.position.x;
    jarWorld.y = r.position.y;
    jarWorld.scale = sc;
    jarWorld.spread = P.spread;
    jarWorld.visible = P.visible;
    jarWorld.backdrop = P.backdrop;
    jarWorld.lid = P.lid;

    /* --- rotation: idle spin ↔ homing to the pose angle, drag + scroll impulses --- */
    if (drag.active) {
      if (performance.now() - drag.lastT > 60) drag.velocity *= Math.exp(-12 * dt);
      S.angVel = damp(S.angVel, drag.velocity, 16, dt);
    } else {
      const auto = 0.42 * P.spin;
      const nearest = P.rot + TAU * Math.round((S.angle - P.rot) / TAU);
      const homing = (1 - P.spin) * 2.8 * (nearest - S.angle);
      S.angVel = damp(S.angVel, auto + homing, 2.1, dt);
    }
    const kick = THREE.MathUtils.clamp(scroll.velocity, -80, 80) * 0.0016;
    S.angVel += kick;
    S.angle += S.angVel * dt;

    if (impulses.spin) {
      S.spinAnim = { t: 0, from: 0 };
      impulses.spin = 0;
    }
    let spinOffset = 0;
    if (S.spinAnim.t < 1) {
      S.spinAnim.t = Math.min(1, S.spinAnim.t + dt / 1.5);
      spinOffset = easeInOut(S.spinAnim.t) * TAU;
    }
    spinOffset -= (1 - ie) * 2.6;
    spin.current!.rotation.y = S.angle + spinOffset;

    drag.tilt = damp(drag.tilt, 0, 3, dt);
    tilt.current!.rotation.x = damp(tilt.current!.rotation.x, P.tilt - pointer.y * 0.09 + drag.tilt, 3.5, dt);
    tilt.current!.rotation.z = damp(
      tilt.current!.rotation.z,
      -pointer.x * 0.06 - THREE.MathUtils.clamp(S.angVel, -6, 6) * 0.012,
      3.5,
      dt,
    );

    /* --- lid: floats open in the hero, screws shut on scroll --- */
    const lid = THREE.MathUtils.clamp(P.lid, 0, 1);
    const lift = 1 - Math.pow(1 - lid, 2.2);
    S.lidSpin += dt * 0.32 * lid;
    lidTilt.current!.position.y = JAR.lid.closedY + lift * 0.74 + Math.sin(t * 1.3 + 1.2) * 0.035 * lid;
    lidTilt.current!.position.x = lift * 0.06;
    lidTilt.current!.rotation.x = lid * (0.46 + Math.sin(t * 0.9) * 0.04);
    lidTilt.current!.rotation.z = lid * (-0.16 + Math.cos(t * 0.7) * 0.035);
    lidSpin.current!.rotation.y = S.angle + spinOffset * (1 - lid) + S.lidSpin - lid * 2.4;

    steamIntensity.current = THREE.MathUtils.clamp(P.steam, 0, 1) * Math.min(1, lid * 1.6);

    /* --- contact shadow --- */
    const sm = shadow.current!.material as THREE.ShaderMaterial;
    sm.uniforms.uOpacity.value = (0.5 - float * 2) * P.visible;

    /* --- label burn transition + sauce colour --- */
    if (labels) {
      const L = labelState.current;
      const wanted = FLAVOR_INDEX[useUI.getState().jarFlavor] ?? 0;
      if (L.active) {
        L.p = Math.min(1, L.p + dt / 1.45);
        burn.uProgress.value = L.p;
        if (L.p >= 1) {
          const tex = labels[L.to];
          mats.label.map = tex.map;
          mats.label.roughnessMap = tex.orm;
          mats.label.metalnessMap = tex.orm;
          burn.uProgress.value = 0;
          L.current = L.to;
          L.active = false;
        }
      } else if (wanted !== L.current) {
        const tex = labels[wanted];
        burn.uMapB.value = tex.map;
        burn.uOrmB.value = tex.orm;
        L.to = wanted;
        L.p = 0;
        L.active = true;
        if (P.drag > 0.5) impulses.spin = 1;
      }
      const f = FLAVORS[L.active ? L.to : L.current].colors;
      const k = 1 - Math.exp(-2.6 * dt);
      sauceU.uSauce.value.lerp(tmp.c.set(f.sauce), k);
      sauceU.uDeep.value.lerp(tmp.d.set(f.sauceDeep), k);
      sauceU.uSeed.value.lerp(tmp.s.set(f.seed), k);

      S.frames++;
      if (!S.readySent && S.frames > 3) {
        S.readySent = true;
        onReady();
      }
    }

    /* --- screen-space bounds for pointer hit-testing --- */
    const top = tmp.v.set(r.position.x - 0.95 * sc, r.position.y + (1.25 + 0.7 * lift) * sc, 0).project(camera);
    const x0 = (top.x * 0.5 + 0.5) * size.width;
    const y0 = (-top.y * 0.5 + 0.5) * size.height;
    const bot = tmp.v.set(r.position.x + 0.95 * sc, r.position.y - 1.1 * sc, 0).project(camera);
    const x1 = (bot.x * 0.5 + 0.5) * size.width;
    const y1 = (-bot.y * 0.5 + 0.5) * size.height;
    jarRect.x = x0;
    jarRect.y = y0;
    jarRect.w = x1 - x0;
    jarRect.h = y1 - y0;
    jarRect.draggable = r.visible && P.drag > 0.5 ? 1 : 0;
  });

  return (
    <group ref={root}>
      <mesh
        ref={shadow}
        geometry={geo.plane}
        material={mats.shadow}
        position={[0, JAR.bottom - 0.34, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2.9, 2.9, 1]}
        renderOrder={1}
      />
      <group ref={tilt}>
        <group ref={spin}>
          <mesh geometry={geo.sauce} material={mats.sauce} />
          <mesh geometry={geo.label} material={mats.label} position={[0, JAR.label.y, 0]} visible={!!labels} />
          <mesh geometry={geo.glass} material={mats.glass} renderOrder={5} />
        </group>
        <group ref={lidTilt} position={[0, JAR.lid.closedY, 0]}>
          <group ref={lidSpin}>
            <mesh geometry={geo.lid} material={mats.lid} />
            <mesh geometry={geo.lidTop} material={mats.lidTop} />
          </group>
        </group>
        <Steam intensity={steamIntensity} y={JAR.fill + 0.02} />
      </group>
    </group>
  );
}
