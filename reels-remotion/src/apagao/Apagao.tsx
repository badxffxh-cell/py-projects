import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timelineJson from "../../public/apagao/timeline.json";
import { Captions } from "./Captions";
import { Clock } from "./Clock";
import { H, SAFE, Timeline, W } from "./constants";
import { LEAD, ShotView } from "./ShotView";

export const timeline = timelineJson as unknown as Timeline;

export type ApagaoProps = { imgDir: string; showSafe: boolean };

const useFonts = () => {
  const [handle] = useState(() => delayRender("Loading Poppins"));
  useEffect(() => {
    const faces = [
      new FontFace("Poppins", `url(${staticFile("apagao/fonts/poppins-latin-700.woff2")})`, { weight: "700" }),
      new FontFace("Poppins", `url(${staticFile("apagao/fonts/poppins-latin-800.woff2")})`, { weight: "800" }),
    ];
    Promise.all(faces.map((f) => f.load()))
      .then((loaded) => {
        loaded.forEach((f) => document.fonts.add(f));
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
};

// Darkness follows the current marco, easing over ~0.6 s
const useDarkness = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ms = timeline.marcos;
  let i = 0;
  ms.forEach((m, k) => {
    if (t >= m.t) i = k;
  });
  const prev = ms[Math.max(0, i - 1)].dark;
  return interpolate(t, [ms[i].t, ms[i].t + 0.6], [prev, ms[i].dark], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const Shots: React.FC<{ imgDir: string }> = ({ imgDir }) => {
  const { fps } = useVideoConfig();
  const dark = useDarkness();
  const shots = timeline.shots;
  return (
    <>
      {shots.map((s, i) => {
        const lead = s.in === "whip" || s.in === "zoom" ? LEAD : 0;
        const from = Math.max(0, Math.round(s.t * fps) - lead);
        const to = Math.round(s.end * fps);
        return (
          <Sequence key={s.id} name={s.id} from={from} durationInFrames={Math.max(1, to - from)} layout="none">
            <ShotView
              shot={s}
              next={shots[i + 1]}
              dark={dark}
              imgDir={imgDir}
              hookFlicker={i === 0 ? timeline.blackout : undefined}
            />
          </Sequence>
        );
      })}
    </>
  );
};

const SafeGuide: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      top: SAFE.top,
      width: W - SAFE.left - SAFE.right,
      height: H - SAFE.top - SAFE.bottom,
      outline: "4px dashed rgba(0,255,120,0.9)",
      boxShadow: "0 0 0 2000px rgba(255,0,60,0.18)",
    }}
  />
);

export const Apagao: React.FC<ApagaoProps> = ({ imgDir, showSafe }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Shots imgDir={imgDir} />
      <Clock marcos={timeline.marcos} blackout={timeline.blackout} />
      <Captions pages={timeline.captions} />
      {showSafe && <SafeGuide />}
    </AbsoluteFill>
  );
};
