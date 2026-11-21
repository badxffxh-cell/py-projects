"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { intro, scroll } from "@/lib/sceneState";
import { createWordmarkTexture, loadFonts, readFonts } from "./textures";
import { jarWorld } from "./quality";

const Z = -3.2;
const DEPTH = new THREE.Vector3(0, 0, Z);

/**
 * The giant FERVOR wordmark lives *inside* the WebGL scene, behind the jar,
 * so the glass genuinely refracts it. It is drawn in the opaque pass with
 * pre-multiplied alpha and no blending, which keeps it in the transmission
 * buffer while still compositing cleanly over the HTML page.
 */
export function Backdrop() {
  const mesh = useRef<THREE.Mesh>(null);
  const [tex, setTex] = useState<{ texture: THREE.Texture; aspect: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let made: THREE.Texture | null = null;
    (async () => {
      const fonts = readFonts();
      await loadFonts(fonts);
      if (cancelled) return;
      const res = createWordmarkTexture("FERVOR", fonts, 2048);
      made = res.texture;
      setTex(res);
    })();
    return () => {
      cancelled = true;
      made?.dispose();
    };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uOpacity: { value: 1 },
          uReveal: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform float uOpacity;
          uniform float uReveal;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv;
            uv.y += (1.0 - uReveal) * 1.02;
            vec4 c = (uv.y > 1.0) ? vec4(0.0) : texture2D(uMap, uv);
            float a = c.a * uOpacity;
            vec4 col = linearToOutputTexel(vec4(c.rgb, 1.0));
            gl_FragColor = vec4(col.rgb * a, a);
          }
        `,
        blending: THREE.NoBlending,
        transparent: false,
        depthWrite: true,
      }),
    [],
  );

  useEffect(() => {
    if (tex) material.uniforms.uMap.value = tex.texture;
  }, [tex, material]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m || !tex) return;
    const op = jarWorld.backdrop;
    m.visible = op > 0.01;
    if (!m.visible) return;
    const vp = state.viewport.getCurrentViewport(state.camera, DEPTH);
    const mobile = state.size.width / state.size.height < 0.85;
    const w = vp.width * (mobile ? 0.96 : 0.965);
    m.scale.set(w, w / tex.aspect, 1);
    const scrollFrac = scroll.y / Math.max(1, state.size.height);
    m.position.set(0, vp.height * (mobile ? 0.17 : 0.085) + scrollFrac * vp.height * 0.42, Z);
    material.uniforms.uOpacity.value = op;
    material.uniforms.uReveal.value = intro.reveal;
  });

  return (
    <mesh ref={mesh} material={material} visible={false} renderOrder={-10}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
