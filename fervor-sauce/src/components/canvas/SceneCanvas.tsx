"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { useUI } from "@/lib/store";
import { drag, jarRect } from "@/lib/sceneState";
import { Scene } from "./Scene";
import { detectQuality, jarWorld } from "./quality";

/**
 * Fixed, full-viewport, transparent WebGL layer (z-10) sandwiched between
 * section backgrounds (z-0/5) and section content (z-20). It never receives
 * pointer events; interaction is hit-tested against the jar's projected
 * screen rect instead, so the page stays fully clickable.
 */
export default function SceneCanvas() {
  const [quality] = useState(detectQuality);
  const [dpr, setDpr] = useState(quality.dpr[1]);
  const setSceneReady = useUI((s) => s.setSceneReady);

  useJarDrag();

  return (
    <>
      <JarGlow />
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-10 h-lvh w-full">
        <Canvas
          dpr={dpr}
          style={{ pointerEvents: "none" }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
          camera={{ fov: 30, position: [0, 0.35, 10], near: 0.1, far: 60 }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.toneMappingExposure = 1.06;
            gl.setClearColor(0x000000, 0);
          }}
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(quality.dpr[1])}
          />
          <Suspense fallback={null}>
            <Scene quality={quality} onReady={setSceneReady} />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}

/** Warm radial glow behind the jar — in the DOM so it shows *through* the glass. */
function JarGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const el = ref.current;
      if (el) {
        const cx = jarRect.x + jarRect.w / 2;
        const cy = jarRect.y + jarRect.h * 0.56;
        const size = Math.max(jarRect.h * 1.75, jarRect.w * 2.4);
        const flick =
          0.86 + Math.sin(t * 0.0021) * 0.06 + Math.sin(t * 0.0053 + 1.2) * 0.05 + Math.sin(t * 0.0117) * 0.03;
        el.style.transform = `translate3d(${cx - 50}px, ${cy - 50}px, 0) scale(${size / 100})`;
        el.style.opacity = String(Math.max(0, jarWorld.visible) * flick);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[6] size-[100px] rounded-full opacity-0"
      style={{
        background:
          "radial-gradient(closest-side, rgb(255 110 40 / 0.5), rgb(255 91 31 / 0.2) 45%, rgb(255 91 31 / 0.06) 68%, transparent 100%)",
        mixBlendMode: "screen",
        willChange: "transform, opacity",
      }}
    />
  );
}

/** Grab-and-spin the jar with the mouse (touch keeps native scrolling). */
function useJarDrag() {
  useEffect(() => {
    const interactive = (el: EventTarget | null) =>
      el instanceof Element &&
      !!el.closest('a,button,input,textarea,select,label,[role="button"],[data-no-drag]');
    const inside = (x: number, y: number) =>
      jarRect.draggable === 1 &&
      x >= jarRect.x - 24 &&
      x <= jarRect.x + jarRect.w + 24 &&
      y >= jarRect.y &&
      y <= jarRect.y + jarRect.h;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if (!inside(e.clientX, e.clientY) || interactive(e.target)) return;
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastT = performance.now();
      drag.velocity = 0;
      document.documentElement.classList.add("is-grabbing");
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag.active) return;
      const now = performance.now();
      const dt = Math.max(4, now - drag.lastT) / 1000;
      const dx = e.clientX - drag.lastX;
      const v = ((dx / window.innerWidth) * 10) / dt;
      drag.velocity = drag.velocity * 0.55 + Math.max(-28, Math.min(28, v)) * 0.45;
      drag.tilt = Math.max(-0.22, Math.min(0.22, drag.tilt + e.movementY * 0.0025));
      drag.lastX = e.clientX;
      drag.lastT = now;
    };
    const up = () => {
      if (!drag.active) return;
      drag.active = false;
      document.documentElement.classList.remove("is-grabbing");
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
  }, []);
}
