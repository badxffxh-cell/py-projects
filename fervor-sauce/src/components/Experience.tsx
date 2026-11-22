import { lazy, Suspense, useEffect } from "react";
import { useUI } from "@/lib/store";
import { hasWebGL } from "@/lib/utils";
import { SmoothScroll } from "./providers/SmoothScroll";
import { ScrollChoreography } from "./ScrollChoreography";
import { Preloader } from "./layout/Preloader";
import { Nav } from "./layout/Nav";
import { Cursor } from "./layout/Cursor";
import { Grain } from "./layout/Grain";
import { CartDrawer } from "./cart/CartDrawer";
import { FlyToCart } from "./cart/FlyToCart";
import { Toaster } from "./cart/Toaster";

// three.js + R3F load as a separate chunk, only in the browser and only with WebGL.
const SceneCanvas = lazy(() => import("./canvas/SceneCanvas"));

/** Global layers: smooth scroll, the WebGL stage and overlays. */
export function Experience() {
  const webgl = useUI((s) => s.webgl);

  useEffect(() => {
    useUI.getState().setWebgl(hasWebGL());
  }, []);

  return (
    <>
      <SmoothScroll />
      <ScrollChoreography />
      {webgl && (
        <Suspense fallback={null}>
          <SceneCanvas />
        </Suspense>
      )}
      <Nav />
      <CartDrawer />
      <FlyToCart />
      <Toaster />
      <Grain />
      <Cursor />
      <Preloader />
    </>
  );
}
