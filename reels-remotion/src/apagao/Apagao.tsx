import { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import timelineJson from "../../public/apagao/timeline.json";
import { ShotLayer } from "./Art";
import { Captions } from "./Captions";
import { CityBackground } from "./CityBackground";
import { Clock } from "./Clock";
import { H, SAFE, Timeline, W } from "./constants";

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

const ShotLayers: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {timeline.shots.map((s) => {
        const from = Math.round(s.t * fps);
        const to = Math.round(s.end * fps);
        return (
          <Sequence key={s.id} name={s.id} from={from} durationInFrames={Math.max(1, to - from)} layout="none">
            <ShotLayer shot={s} />
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
      <CityBackground shots={timeline.shots} marcos={timeline.marcos} blackout={timeline.blackout} imgDir={imgDir} />
      <ShotLayers />
      <Clock marcos={timeline.marcos} blackout={timeline.blackout} />
      <Captions pages={timeline.captions} />
      {showSafe && <SafeGuide />}
    </AbsoluteFill>
  );
};
