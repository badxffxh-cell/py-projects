import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { H, Marco, Shot, W } from "./constants";

export const LEAD = 8; // frames of a whip/zoom transition before the cut point
const ease = Easing.bezier(0.45, 0, 0.2, 1);

type Cam = { fx: number; fy: number; z: number };

const camAt = (s: Shot, localS: number): Cam => {
  const [fx, fy, z0, z1] = s.focus;
  const d = s.end - s.t;
  return { fx, fy, z: interpolate(localS, [0, d], [z0, z1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) };
};

// The city photo, getting darker level by level, with a camera that drifts
// slowly inside each shot and whip-pans between shots.
export const CityBackground: React.FC<{
  shots: Shot[];
  marcos: Marco[];
  blackout: number;
  imgDir: string;
}> = ({ shots, marcos, blackout, imgDir }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // --- camera
  let i = 0;
  shots.forEach((s, k) => {
    if (t >= s.t) i = k;
  });
  const s = shots[i];
  let cam = camAt(s, t - s.t);
  let blur = 0;
  let shake = 0;
  const next = shots[i + 1];
  if (next && next.in === "whip") {
    const p = interpolate(frame, [next.t * fps - LEAD, next.t * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    });
    if (p > 0) {
      const to = camAt(next, 0);
      cam = { fx: cam.fx + (to.fx - cam.fx) * p, fy: cam.fy + (to.fy - cam.fy) * p, z: cam.z + (to.z - cam.z) * p };
      blur = Math.sin(Math.PI * p) * 36;
      shake = Math.sin(Math.PI * p) * -260; // extra horizontal travel = whip
    }
  }
  if (s.in === "zoom") {
    const f = frame - s.t * fps;
    cam = { ...cam, z: cam.z * interpolate(f, [0, LEAD], [1.35, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }) };
    blur += interpolate(f, [0, LEAD], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  if (s.in === "whip") {
    const f = frame - s.t * fps;
    blur += interpolate(f, [0, 4], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  // --- darkness level: crossfade over 0.6 s at each marco
  let m = 0;
  marcos.forEach((mk, k) => {
    if (t >= mk.t) m = k;
  });
  const curL = marcos[m].level;
  const prevL = marcos[Math.max(0, m - 1)].level;
  const mix = interpolate(t, [marcos[m].t, marcos[m].t + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // blackout flicker on the hook (lights go out), and lights flickering back at the very end
  let flick = 0;
  const fb = frame - blackout * fps;
  if (fb >= 0 && fb < 14) flick = [0.9, 0.2, 0.95, 0.5, 0.97, 0.75, 0.6][Math.floor(fb / 2)];
  const endShot = shots[shots.length - 1];
  let lightsBack = 0;
  if (endShot.artT !== undefined) {
    const fe = frame - (endShot.artT - 0.4) * fps;
    if (fe >= 0) lightsBack = [0, 0.5, 0, 0.7, 0.1, 0.8, 0.35, 0.55][Math.floor(fe / 3) % 8] * 0.55;
  }

  // art shots get a softer, darker background so the illustration reads
  const artDim = s.art && s.art !== "cta" ? 0.18 : 0;
  const artBlur = s.art && s.art !== "cta" ? 1.5 : 0;

  const style = (opacity: number): React.CSSProperties => ({
    position: "absolute",
    width: W,
    height: H,
    left: 0,
    top: 0,
    objectFit: "cover",
    opacity,
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${cam.fx * W}px ${cam.fy * H}px`,
          transform: `translateX(${shake}px) scale(${cam.z})`,
          filter: `blur(${blur + artBlur}px)`,
        }}
      >
        <Img src={staticFile(`${imgDir}/city_lv${prevL}.png`)} style={style(1)} />
        {mix > 0 && curL !== prevL && <Img src={staticFile(`${imgDir}/city_lv${curL}.png`)} style={style(mix)} />}
        {lightsBack > 0 && <Img src={staticFile(`${imgDir}/city_lv0.png`)} style={style(lightsBack)} />}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: flick + artDim }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 620,
          background: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0))",
        }}
      />
    </div>
  );
};
