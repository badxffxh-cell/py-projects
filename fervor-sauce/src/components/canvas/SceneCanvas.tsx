import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { useUI } from "@/lib/store";
import { gsap } from "@/lib/gsap";
import { lockScroll } from "@/lib/lenis";
import { drag, jarRect, pointer } from "@/lib/sceneState";
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
  useMobileMotion();

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

/**
 * Grab-and-spin the jar. Mouse: press and drag. Touch: a mostly horizontal
 * swipe that starts on the jar spins it (scroll is held while spinning);
 * vertical swipes keep scrolling the page as usual.
 */
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
    const overlayOpen = () => {
      const ui = useUI.getState();
      return ui.cartOpen || ui.menuOpen;
    };

    let touch: { id: number; x0: number; y0: number; spinning: boolean } | null = null;

    const begin = (x: number) => {
      drag.active = true;
      drag.lastX = x;
      drag.lastT = performance.now();
      drag.velocity = 0;
    };

    const down = (e: PointerEvent) => {
      if (overlayOpen() || !inside(e.clientX, e.clientY) || interactive(e.target)) return;
      if (e.pointerType === "mouse") {
        if (e.button !== 0) return;
        begin(e.clientX);
        document.documentElement.classList.add("is-grabbing");
        e.preventDefault();
      } else if (e.pointerType === "touch" && e.isPrimary) {
        touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, spinning: false };
      }
    };

    const move = (e: PointerEvent) => {
      if (touch && e.pointerId === touch.id && !touch.spinning) {
        const dx = e.clientX - touch.x0;
        const dy = e.clientY - touch.y0;
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          touch.spinning = true;
          begin(e.clientX);
          lockScroll(true);
        } else if (Math.abs(dy) > 12) {
          touch = null; // a vertical swipe: let the page scroll
        }
        return;
      }
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
      if (touch?.spinning) lockScroll(false);
      touch = null;
      if (!drag.active) return;
      drag.active = false;
      document.documentElement.classList.remove("is-grabbing");
    };

    // While a finger is spinning the jar, stop the browser from panning.
    const holdTouch = (e: TouchEvent) => {
      if (touch?.spinning && e.cancelable) e.preventDefault();
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    window.addEventListener("touchmove", holdTouch, { passive: false });
    return () => {
      up();
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      window.removeEventListener("touchmove", holdTouch);
    };
  }, []);
}

/**
 * Phones have no hover, so the scene borrows motion from elsewhere: the
 * gyroscope tilts the jar and slides its reflections (where the browser
 * allows it without a permission prompt), a lifted finger stops pushing
 * spices around, and with no input at all the light slowly sways on its own.
 */
function useMobileMotion() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let gyro = false;
    let lastTouch = -1e9;
    const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      gyro = true;
      if (performance.now() - lastTouch < 1500) return; // a finger on screen wins
      pointer.x = clamp1(e.gamma / 28);
      pointer.y = clamp1(-(e.beta - 50) / 28);
    };
    const onTouch = (e: PointerEvent) => {
      if (e.pointerType === "touch") lastTouch = performance.now();
    };
    const onLift = (e: PointerEvent) => {
      if (e.pointerType === "touch") pointer.moved = false;
    };
    const ambient = () => {
      if (gyro || performance.now() - lastTouch < 2500) return;
      const t = performance.now() / 1000;
      pointer.x = Math.sin(t * 0.35) * 0.35;
      pointer.y = Math.sin(t * 0.27 + 1) * 0.2;
    };

    // iOS only delivers orientation after an explicit permission prompt — we
    // never trigger one unprompted, so iPhones get the ambient sway instead.
    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission ===
      "function";
    if (!needsPermission) window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("pointerdown", onTouch, { passive: true });
    window.addEventListener("pointermove", onTouch, { passive: true });
    window.addEventListener("pointerup", onLift, { passive: true });
    window.addEventListener("pointercancel", onLift, { passive: true });
    gsap.ticker.add(ambient);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("pointerdown", onTouch);
      window.removeEventListener("pointermove", onTouch);
      window.removeEventListener("pointerup", onLift);
      window.removeEventListener("pointercancel", onLift);
      gsap.ticker.remove(ambient);
    };
  }, []);
}
