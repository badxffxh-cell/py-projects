import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, ALERT, FONT, Marco, SAFE, SAFE_W } from "./constants";

const toMinutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Clock showing the current marco, rolling quickly from the previous value.
export const Clock: React.FC<{ marcos: Marco[]; blackout: number }> = ({ marcos, blackout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let idx = 0;
  marcos.forEach((m, i) => {
    if (t >= m.t) idx = i;
  });
  const cur = marcos[idx];
  const prev = marcos[Math.max(0, idx - 1)];
  const since = frame - Math.round(cur.t * fps);
  const isDays = cur.clock.includes("DIAS");

  let text = cur.clock;
  if (!isDays && idx > 0) {
    const roll = interpolate(since, [0, 12], [toMinutes(prev.clock), toMinutes(cur.clock)], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    text = fmt(roll);
  }

  const pop = spring({ frame: since, fps, config: { damping: 12, stiffness: 180 }, durationInFrames: 14 });
  const scale = idx === 0 ? 1 : interpolate(pop, [0, 1], [1.25, 1]);

  // Hero moment: from 24:00 ("22 DIAS" after it) the clock grows and moves to the centre until the final CTA
  const firstDays = marcos.find((m) => m.clock === "24:00");
  const last = marcos[marcos.length - 1];
  let heroY = 0;
  let heroScale = 1;
  if (firstDays) {
    const fIn = interpolate(frame, [firstDays.t * fps, firstDays.t * fps + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.4)),
    });
    const fOut = interpolate(frame, [last.t * fps, last.t * fps + 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    const hero = fIn * (1 - fOut);
    heroY = hero * 420;
    heroScale = 1 + hero * 0.55;
  }
  const before = t < blackout;
  const color = isDays ? ALERT : before ? "rgba(255,255,255,0.85)" : "#fff";

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        width: SAFE_W,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
        transform: `translateY(${heroY}px) scale(${heroScale})`,
        transformOrigin: "50% 0",
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 6,
          color: isDays ? ALERT : ACCENT,
          textShadow: "0 2px 8px rgba(0,0,0,0.9)",
        }}
      >
        {before ? "AGORA" : "SEM LUZ HÁ"}
      </div>
      <div
        style={{
          marginTop: 4,
          padding: "6px 34px",
          borderRadius: 24,
          background: "rgba(0,0,0,0.55)",
          border: `3px solid ${isDays ? ALERT : "rgba(255,255,255,0.25)"}`,
          fontSize: 112,
          lineHeight: 1.05,
          fontWeight: 800,
          color,
          fontVariantNumeric: "tabular-nums",
          transform: `scale(${scale})`,
          textShadow: "0 4px 16px rgba(0,0,0,0.8)",
        }}
      >
        {text}
      </div>
    </div>
  );
};
