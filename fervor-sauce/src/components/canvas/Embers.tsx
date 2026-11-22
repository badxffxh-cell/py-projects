import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { rangeRng } from "@/lib/random";
import { emberFragment, emberVertex, makeAdditiveLight } from "./shaders";
import { jarWorld } from "./quality";

/** Glowing sparks drifting up around the jar (GPU-animated points). */
export function Embers({ count = 140 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const height = 5.2;

  const geometry = useMemo(() => {
    const rand = rangeRng(4242 + count);
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(rand()) * 2.6 + 0.35;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rand(0, height);
      pos[i * 3 + 2] = Math.sin(a) * r * 0.55;
      rnd[i * 4] = rand();
      rnd[i * 4 + 1] = rand();
      rnd[i * 4 + 2] = rand();
      rnd[i * 4 + 3] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      makeAdditiveLight(
        new THREE.ShaderMaterial({
          vertexShader: emberVertex,
          fragmentShader: emberFragment,
          uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: 1 },
            uSize: { value: 34 },
            uHeight: { value: height },
            uOpacity: { value: 1 },
          },
        }),
      ),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const p = points.current;
    if (!p) return;
    p.visible = jarWorld.visible > 0.02;
    if (!p.visible) return;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
    material.uniforms.uOpacity.value = (0.55 + 0.55 * jarWorld.spread) * jarWorld.visible;
    p.position.set(jarWorld.x, jarWorld.y, 0.2);
    p.scale.setScalar(jarWorld.scale * 0.9);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={30} />;
}
