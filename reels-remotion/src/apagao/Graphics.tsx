import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, ALERT, FONT, SAFE, SAFE_W } from "./constants";

// All graphics live between y=600 and y=1060: below clock/labels, above captions.
const box: React.CSSProperties = {
  position: "absolute",
  left: SAFE.left,
  width: SAFE_W,
  top: 600,
  height: 440,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: FONT,
  color: "#fff",
};

// Internet traffic falling from 100% to 17% (NetBlocks, Spain 2025)
export const Chart17: React.FC = () => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [6, 42], [100, 17], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const barW = 640;
  return (
    <div style={box}>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4, color: "#ddd" }}>INTERNET</div>
      <div
        style={{
          fontSize: 190,
          fontWeight: 800,
          lineHeight: 1,
          color: v < 30 ? ALERT : "#fff",
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 6px 24px rgba(0,0,0,0.8)",
        }}
      >
        {Math.round(v)}%
      </div>
      <div
        style={{
          marginTop: 24,
          width: barW,
          height: 34,
          borderRadius: 17,
          background: "rgba(255,255,255,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: (barW * v) / 100,
            height: "100%",
            background: v < 30 ? ALERT : ACCENT,
            borderRadius: 17,
          }}
        />
      </div>
    </div>
  );
};

// Signal bars dropping one by one, then "SEM SERVIÇO"
export const NoSignal: React.FC<{ goneAt: number }> = ({ goneAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const goneF = goneAt * fps;
  const bars = [0, 1, 2, 3];
  const lit = Math.max(0, 4 - Math.floor(interpolate(frame, [0, goneF], [0, 4], { extrapolateRight: "clamp" })));
  const pop = spring({ frame: frame - goneF, fps, config: { damping: 12 }, durationInFrames: 10 });
  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 22, height: 220 }}>
        {bars.map((b) => (
          <div
            key={b}
            style={{
              width: 56,
              height: 60 + b * 50,
              borderRadius: 10,
              background: b < lit ? "#fff" : "rgba(255,255,255,0.18)",
              boxShadow: b < lit ? "0 0 24px rgba(255,255,255,0.5)" : "none",
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 86,
          fontWeight: 800,
          color: ALERT,
          opacity: frame >= goneF ? 1 : 0,
          transform: `scale(${interpolate(pop, [0, 1], [1.4, 1])})`,
          textShadow: "0 4px 18px rgba(0,0,0,0.9)",
        }}
      >
        SEM SERVIÇO
      </div>
    </div>
  );
};

export const CTA: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at * fps;
  const pop = spring({ frame: f, fps, config: { damping: 13 }, durationInFrames: 12 });
  if (f < 0) return null;
  return (
    <div style={box}>
      <div
        style={{
          padding: "22px 44px",
          borderRadius: 28,
          background: ACCENT,
          color: "#111",
          fontSize: 62,
          fontWeight: 800,
          transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        COMENTA ↓<br />E SALVA
      </div>
    </div>
  );
};
