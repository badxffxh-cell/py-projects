import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { pointer } from "@/lib/sceneState";
import { damp } from "@/lib/utils";
import { jarWorld } from "./quality";

/**
 * Product-photography lighting, fully procedural (no HDR download):
 * a dark studio cube of lightformers gives the long strip reflections that
 * sell curved glass, plus real lights that move — a key light that follows
 * the cursor, an orange "fire" bounce that flickers under the jar, and a
 * warm rim from behind. The environment itself slowly orbits with the
 * pointer so reflections glide across the glass.
 */
export function Studio() {
  const scene = useThree((s) => s.scene);
  const key = useRef<THREE.SpotLight>(null);
  const fire = useRef<THREE.PointLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const envRot = useRef({ x: 0, y: 0 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;

    // Reflections drift with the cursor + a slow breathing orbit.
    envRot.current.y = damp(envRot.current.y, pointer.x * 0.55 + Math.sin(t * 0.12) * 0.25, 2.2, dt);
    envRot.current.x = damp(envRot.current.x, -pointer.y * 0.12, 2.2, dt);
    scene.environmentRotation.set(envRot.current.x, envRot.current.y, 0);

    if (key.current) {
      key.current.position.x = damp(key.current.position.x, jarWorld.x - 4.5 + pointer.x * 3.2, 2.5, dt);
      key.current.position.y = damp(key.current.position.y, 5.5 + pointer.y * 2.4, 2.5, dt);
      key.current.target.position.set(jarWorld.x, jarWorld.y, 0);
      key.current.target.updateMatrixWorld();
    }
    if (fire.current) {
      const flick =
        0.78 +
        Math.sin(t * 7.3) * 0.08 +
        Math.sin(t * 13.1 + 1.7) * 0.06 +
        Math.sin(t * 23.7 + 0.4) * 0.04 +
        Math.sin(t * 2.1) * 0.06;
      fire.current.intensity = 16 * flick * jarWorld.visible;
      fire.current.position.set(jarWorld.x + 1.1 + Math.sin(t * 0.8) * 0.25, jarWorld.y - 1.9, 2.4);
    }
    if (rim.current) {
      rim.current.position.set(jarWorld.x + 4, jarWorld.y + 3, -6);
      rim.current.target.position.set(jarWorld.x, jarWorld.y, 0);
      rim.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#ffe6d2" />
      <spotLight
        ref={key}
        position={[-4.5, 5.5, 7]}
        angle={0.5}
        penumbra={1}
        intensity={190}
        color="#fff0e0"
        decay={2}
      />
      <pointLight ref={fire} position={[1.1, -1.9, 2.4]} intensity={16} color="#ff5b1f" decay={2} />
      <directionalLight ref={rim} position={[4, 3, -6]} intensity={2.2} color="#ffb27a" />
      <directionalLight position={[0, 8, 3]} intensity={0.45} color="#ffffff" />

      <Environment resolution={256} frames={1} environmentIntensity={1}>
        <color attach="background" args={["#060404"]} />
        {/* tall key strips — the classic glass highlights */}
        <Lightformer form="rect" intensity={4} color="#fff3e6" position={[-4.2, 0.6, 3]} scale={[1.1, 9, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ffe8d4" position={[4.4, 0.3, 2.2]} scale={[0.7, 9, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[-1.6, 0.2, 5]} scale={[0.25, 7, 1]} />
        {/* overhead softbox */}
        <Lightformer form="rect" intensity={1.6} color="#fff6ee" position={[0, 6, 1]} scale={[7, 2.4, 1]} />
        {/* orange fire bounce from below and behind — brand-colored rim reflections */}
        <Lightformer form="rect" intensity={3.2} color="#ff5b1f" position={[0, -5, 1.5]} scale={[9, 1.6, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#ff7a2c" position={[-5, -1, -4]} scale={[3, 7, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ff9b3a" position={[5, 1.5, -4]} scale={[2, 6, 1]} />
        {/* ring catchlight for the lid */}
        <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[2.5, 4, 6]} scale={1.6} />
      </Environment>
    </>
  );
}
