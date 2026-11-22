import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { clearTransitions, easeInOut, setTransitions, type PoseName, type Transition } from "@/lib/choreography";
import { setSceneActive } from "@/lib/sceneState";
import { useUI } from "@/lib/store";

const DEFS: { trigger: string; start: string; end: string; to: PoseName }[] = [
  { trigger: "#story", start: "top bottom", end: "top top", to: "story" },
  { trigger: "#story", start: "top top", end: "bottom bottom", to: "storyEnd" },
  { trigger: "#process", start: "top bottom", end: "top 15%", to: "process" },
  { trigger: "#process", start: "top 15%", end: "bottom bottom", to: "processEnd" },
  { trigger: "#ingredients", start: "top bottom", end: "top top", to: "ingredients" },
  { trigger: "#ingredients", start: "top top", end: "bottom bottom", to: "ingredientsEnd" },
  { trigger: "#flavors", start: "top bottom", end: "top top", to: "flavors" },
  { trigger: "#shop", start: "top bottom", end: "top top", to: "shop" },
  { trigger: "#shop", start: "top top", end: "top -45%", to: "shopOut" },
  { trigger: "#collection", start: "top bottom", end: "top 30%", to: "exit" },
];

/**
 * Registers the scroll anchors that drive the 3D jar (see lib/choreography)
 * and pauses WebGL rendering once the jar has left the page.
 */
export function ScrollChoreography() {
  useEffect(() => {
    const created: ScrollTrigger[] = [];
    const list: Transition[] = [];
    for (const d of DEFS) {
      if (!document.querySelector(d.trigger)) continue;
      const st = ScrollTrigger.create({ trigger: d.trigger, start: d.start, end: d.end });
      created.push(st);
      list.push({ st, to: d.to, ease: easeInOut });
    }
    setTransitions(list);

    const sleep = document.querySelector("#collection")
      ? ScrollTrigger.create({
          trigger: "#collection",
          start: "top 15%",
          onEnter: () => setSceneActive(false),
          onLeaveBack: () => setSceneActive(true),
        })
      : null;

    // While the shop section is on screen the jar shows the configurator's choice.
    let unsub: (() => void) | null = null;
    const shop = document.querySelector("#shop")
      ? ScrollTrigger.create({
          trigger: "#shop",
          start: "top 60%",
          end: "bottom 40%",
          onToggle: (self) => {
            unsub?.();
            unsub = null;
            if (self.isActive) {
              const ui = useUI.getState();
              ui.setJarFlavor(ui.shopFlavor);
              unsub = useUI.subscribe((s, prev) => {
                if (s.shopFlavor !== prev.shopFlavor) s.setJarFlavor(s.shopFlavor);
              });
            }
          },
        })
      : null;

    ScrollTrigger.refresh();
    return () => {
      unsub?.();
      created.forEach((s) => s.kill());
      sleep?.kill();
      shop?.kill();
      clearTransitions();
      setSceneActive(true);
    };
  }, []);

  return null;
}
