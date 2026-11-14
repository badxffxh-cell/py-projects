import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, SAFE, SAFE_W, Shot } from "./constants";
import { CTA, Chart17, NoSignal } from "./Graphics";

export const LEAD = 8; // frames a whip/zoom transition starts before the cut point

const ease = Easing.bezier(0.33, 0, 0.2, 1);

// One shot: slow zoom (Ken Burns), transition in, darkness filter, label and graphic.
export const ShotView: React.FC<{
  shot: Shot;
  next?: Shot;
  dark: number;
  imgDir: string;
  hookFlicker?: number; // seconds (relative to shot) of the blackout flicker
}> = ({ shot, next, dark, imgDir, hookFlicker }) => {
  const frame = useCurrentFrame(); // 0 = transition start (LEAD frames before shot.t when not a cut)
  const { fps } = useVideoConfig();
  const lead = shot.in === "whip" || shot.in === "zoom" ? LEAD : 0;
  const local = frame - lead; // 0 = shot.t
  const durF = (shot.end - shot.t) * fps;

  // slow zoom over the whole shot, alternating pan direction
  const dir = shot.id.length % 2 === 0 ? 1 : -1;
  let scale = interpolate(local, [0, durF], [1.06, 1.16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let x = interpolate(local, [0, durF], [0, 24 * dir], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let blur = 0;
  let opacity = 1;

  if (shot.in === "whip") {
    x += interpolate(frame, [0, LEAD], [1100, 0], { extrapolateRight: "clamp", easing: ease });
    blur += interpolate(frame, [0, LEAD], [40, 0], { extrapolateRight: "clamp" });
  } else if (shot.in === "zoom") {
    scale *= interpolate(frame, [0, LEAD], [1.45, 1], { extrapolateRight: "clamp", easing: ease });
    opacity = interpolate(frame, [0, LEAD], [0, 1], { extrapolateRight: "clamp" });
    blur += interpolate(frame, [0, LEAD], [18, 0], { extrapolateRight: "clamp" });
  }
  // outgoing half of a whip: push left with blur
  if (next?.in === "whip") {
    const out0 = durF - LEAD;
    x += interpolate(local, [out0, durF], [0, -900], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
    blur += interpolate(local, [out0, durF], [0, 36], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  // blackout flicker on the hook: lights go out
  let flick = 0;
  if (hookFlicker !== undefined) {
    const f = local - hookFlicker * fps;
    const pattern = [0, 0.85, 0.3, 0.9, 0.55, 0.92, 0.8];
    flick = f < 0 ? 0 : f < pattern.length * 2 ? pattern[Math.floor(f / 2)] : 0.8;
  }

  const graphicBlur = shot.graphic === "chart17" ? 14 : shot.graphic === "nosignal" ? 6 : 0;
  const filter = `brightness(${1 - dark * 0.45}) saturate(${1 - dark * 0.55}) blur(${blur + graphicBlur}px)`;

  const labelF = shot.label ? (shot.label.t - shot.t) * fps : 0;
  const labelIn = interpolate(local, [labelF, labelF + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity }}>
      <Img
        src={staticFile(`${imgDir}/${shot.img}.png`)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px) scale(${scale})`,
          filter,
        }}
      />
      {/* darkness + vignette */}
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: dark * 0.55 + flick }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      {/* readability gradients behind clock (top) and captions */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 620,
          background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))",
        }}
      />
      {shot.graphic === "chart17" && <Chart17 />}
      {shot.graphic === "nosignal" && <NoSignal goneAt={(shot.graphicT ?? shot.end) - shot.t + lead / fps} />}
      {shot.graphic === "cta" && <CTA at={(shot.graphicT ?? shot.t) - shot.t + lead / fps} />}
      {shot.label && (
        <div
          style={{
            position: "absolute",
            top: 470,
            left: SAFE.left,
            width: SAFE_W,
            display: "flex",
            justifyContent: "center",
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 24}px)`,
          }}
        >
          <div
            style={{
              maxWidth: SAFE_W,
              padding: "12px 26px",
              borderRadius: 18,
              background: "rgba(10,10,10,0.72)",
              borderLeft: "6px solid #FFB300",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 38,
              lineHeight: 1.25,
              color: "#fff",
              textAlign: "center",
            }}
          >
            {shot.label.text}
          </div>
        </div>
      )}
    </div>
  );
};
