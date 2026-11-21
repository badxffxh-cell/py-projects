"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
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

const SceneCanvas = dynamic(() => import("./canvas/SceneCanvas"), { ssr: false });

/** Client-only global layers: smooth scroll, the WebGL stage and overlays. */
export function Experience() {
  const webgl = useUI((s) => s.webgl);

  useEffect(() => {
    useUI.getState().setWebgl(hasWebGL());
  }, []);

  return (
    <>
      <SmoothScroll />
      <ScrollChoreography />
      {webgl && <SceneCanvas />}
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
