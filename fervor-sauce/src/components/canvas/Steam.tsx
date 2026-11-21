"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { steamFragment, steamVertex } from "./shaders";

interface SteamProps {
  /** Read every frame; 0 hides the steam entirely. */
  intensity: { current: number };
  y?: number;
}

/** Three overlapping noise-driven wisps rising from the jar mouth. */
export function Steam({ intensity, y = 0.52 }: SteamProps) {
  const group = useRef<THREE.Group>(null);
  const layers = useMemo(
    () =>
      [
        { seed: 0.13, z: 0.18, x: -0.05, w: 1.5, h: 3.1, o: 0.5 },
        { seed: 0.57, z: -0.12, x: 0.08, w: 1.8, h: 3.5, o: 0.38 },
        { seed: 0.91, z: 0.32, x: 0.02, w: 1.2, h: 2.6, o: 0.32 },
      ].map((l) => ({
        ...l,
        material: new THREE.ShaderMaterial({
          vertexShader: steamVertex,
          fragmentShader: steamFragment,
          uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uSeed: { value: l.seed },
            uColor: { value: new THREE.Color("#fff3e6") },
          },
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      })),
    [],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), []);

  useFrame((state) => {
    const k = intensity.current;
    if (group.current) group.current.visible = k > 0.01;
    if (k <= 0.01) return;
    for (const l of layers) {
      l.material.uniforms.uTime.value = state.clock.elapsedTime;
      l.material.uniforms.uOpacity.value = k * l.o;
    }
  });

  return (
    <group ref={group}>
      {layers.map((l, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={l.material}
          position={[l.x, y + l.h / 2, l.z]}
          scale={[l.w, l.h, 1]}
          renderOrder={20 + i}
        />
      ))}
    </group>
  );
}
