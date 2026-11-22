import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { renderControl } from "@/lib/sceneState";
import { createClearQuad } from "./shaders";
import { Studio } from "./Studio";
import { Backdrop } from "./Backdrop";
import { Jar } from "./Jar";
import { Spices } from "./Spices";
import { Embers } from "./Embers";
import type { Quality } from "./quality";

export function Scene({ quality, onReady }: { quality: Quality; onReady: () => void }) {
  const clearQuad = useMemo(() => createClearQuad(), []);
  const setFrameloop = useThree((s) => s.setFrameloop);

  useEffect(() => {
    renderControl.setFrameloop = setFrameloop;
    setFrameloop(renderControl.active ? "always" : "never");
    return () => {
      renderControl.setFrameloop = null;
    };
  }, [setFrameloop]);

  useEffect(
    () => () => {
      clearQuad.geometry.dispose();
      (clearQuad.material as THREE.Material).dispose();
    },
    [clearQuad],
  );

  return (
    <>
      <primitive object={clearQuad} />
      <Studio />
      <Backdrop />
      <Jar quality={quality} onReady={onReady} />
      <Spices density={quality.spices} />
      <Embers count={quality.embers} />
    </>
  );
}
