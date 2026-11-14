import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, ALERT, FONT, SAFE, SAFE_W, Shot } from "./constants";
import { CTA, Chart17, NoSignal } from "./Graphics";

// Line-art illustrations, animated. They live in the band y=600..1060
// (below the clock and the fact label, above the captions).
const INK = "#F4F1EA";
const OFF = "#2b2b2e";
const SW = 10;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.33, 0, 0.2, 1);

const Stage: React.FC<{ children: React.ReactNode; glow?: string }> = ({ children, glow = "rgba(255,179,0,0.35)" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 12 });
  return (
    <svg
      viewBox="0 0 400 400"
      width={440}
      height={440}
      style={{
        position: "absolute",
        left: SAFE.left + SAFE_W / 2 - 220,
        top: 612,
        overflow: "visible",
        opacity: interpolate(frame, [0, 5], [0, 1], clamp),
        transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        filter: `drop-shadow(0 0 22px ${glow})`,
      }}
      fill="none"
      stroke={INK}
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
};

const Traffic: React.FC = () => {
  const f = useCurrentFrame();
  // red lamp on, flickers, then everything off
  const flick = [1, 0, 1, 0.3, 0, 0.8, 0][Math.floor(Math.max(0, f - 8) / 2)] ?? 0;
  const red = f < 8 ? 1 : flick;
  return (
    <Stage>
      <rect x={185} y={300} width={30} height={100} fill={INK} stroke="none" rx={6} />
      <rect x={120} y={10} width={160} height={300} rx={36} fill="#111" />
      <circle cx={200} cy={75} r={40} fill={red > 0.5 ? ALERT : OFF} opacity={0.4 + 0.6 * red} />
      <circle cx={200} cy={160} r={40} fill={OFF} />
      <circle cx={200} cy={245} r={40} fill={OFF} />
    </Stage>
  );
};

const Card: React.FC = () => {
  const f = useCurrentFrame();
  const cardY = interpolate(f, [0, 10], [-60, 0], { ...clamp, easing: ease });
  const screenOn = f < 14 ? 1 : f < 20 ? [0, 1, 0, 0.6, 0, 0][f - 14] : 0;
  const x = spring({ frame: f - 22, fps: 30, config: { damping: 12 }, durationInFrames: 10 });
  return (
    <Stage>
      <g transform={`translate(0 ${cardY})`}>
        <rect x={125} y={-10} width={150} height={92} rx={12} fill="#1b1b1b" />
        <line x1={125} y1={22} x2={275} y2={22} />
      </g>
      <rect x={110} y={60} width={180} height={320} rx={28} fill="#111" />
      <rect x={135} y={90} width={130} height={95} rx={10} fill={screenOn > 0.5 ? ACCENT : OFF} strokeWidth={6} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={155 + c * 45} cy={225 + r * 45} r={11} fill={INK} stroke="none" />),
      )}
      <g transform={`translate(300 70) scale(${x})`}>
        <circle r={42} fill={ALERT} stroke="none" />
        <path d="M-16 -16 L16 16 M16 -16 L-16 16" stroke="#fff" strokeWidth={11} />
      </g>
    </Stage>
  );
};

const Hospital: React.FC = () => {
  const f = useCurrentFrame();
  // generator kicks in: windows come back with a flicker after ~10 frames
  const on = f < 10 ? 0 : f < 18 ? [1, 0, 1, 0.4, 1, 0.7, 1, 1][f - 10] : 1;
  const bolt = spring({ frame: f - 6, fps: 30, config: { damping: 11 }, durationInFrames: 10 });
  return (
    <Stage glow="rgba(120,220,255,0.3)">
      <rect x={60} y={130} width={280} height={250} rx={10} fill="#111" />
      <rect x={160} y={30} width={80} height={80} rx={12} fill="#111" />
      <path d="M200 48 V92 M178 70 H222" stroke={ALERT} strokeWidth={14} />
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => (
          <rect key={`${c}${r}`} x={90 + c * 80} y={170 + r * 80} width={60} height={50} rx={6}
            fill={on > 0.5 ? "#BFEFFF" : OFF} strokeWidth={6} />
        )),
      )}
      <g transform={`translate(330 340) scale(${bolt})`}>
        <circle r={48} fill={ACCENT} stroke="none" />
        <path d="M6 -30 L-16 4 H2 L-6 30 L18 -6 H0 Z" fill="#111" stroke="none" />
      </g>
    </Stage>
  );
};

const Call: React.FC = () => {
  const f = useCurrentFrame();
  const failed = f > 40;
  const dots = Math.floor(f / 6) % 4;
  const x = spring({ frame: f - 40, fps: 30, config: { damping: 12 }, durationInFrames: 10 });
  return (
    <Stage>
      <rect x={110} y={10} width={180} height={380} rx={32} fill="#111" />
      <line x1={175} y1={40} x2={225} y2={40} strokeWidth={8} />
      <g transform={`translate(200 190) rotate(${failed ? 135 : 0})`}>
        <path
          d="M-38 -24 C-38 -40 -24 -46 -14 -36 L-4 -24 C2 -16 -2 -8 -10 -4 C-6 10 6 20 18 24 C22 16 30 12 38 18 L48 28 C56 38 50 50 36 50 C-4 46 -38 12 -38 -24 Z"
          fill={failed ? ALERT : ACCENT}
          stroke="none"
        />
      </g>
      {!failed && [0, 1, 2].map((d) => <circle key={d} cx={170 + d * 30} cy={290} r={9} fill={d < dots ? INK : OFF} stroke="none" />)}
      {failed && (
        <g transform={`translate(200 300) scale(${x})`}>
          <path d="M-22 -22 L22 22 M22 -22 L-22 22" stroke={ALERT} strokeWidth={12} />
        </g>
      )}
    </Stage>
  );
};

const Tower: React.FC<{ durF: number }> = ({ durF }) => {
  const f = useCurrentFrame();
  const level = interpolate(f, [6, durF * 0.85], [1, 0], clamp);
  const blink = level > 0.02 && Math.floor(f / 10) % 2 === 0;
  const color = level > 0.5 ? "#7BE07B" : level > 0.2 ? ACCENT : ALERT;
  return (
    <Stage>
      {/* lattice tower */}
      <path d="M130 20 L70 390 M130 20 L190 390 M92 260 L168 260 M104 180 L156 180 M114 110 L146 110" />
      <path d="M92 260 L156 180 M168 260 L104 180 M104 180 L146 110 M156 180 L114 110 M80 330 L168 260 M180 330 L92 260" strokeWidth={6} />
      <rect x={96} y={50} width={18} height={50} rx={4} fill={INK} stroke="none" />
      <rect x={146} y={50} width={18} height={50} rx={4} fill={INK} stroke="none" />
      <circle cx={130} cy={14} r={12} fill={blink ? ALERT : OFF} stroke="none" />
      {/* battery */}
      <rect x={250} y={110} width={100} height={250} rx={18} fill="#111" />
      <rect x={280} y={88} width={40} height={22} rx={6} fill={INK} stroke="none" />
      <rect x={264} y={124 + 222 * (1 - level)} width={72} height={222 * level} rx={8} fill={color} stroke="none" />
    </Stage>
  );
};

const Fridge: React.FC<{ durF: number }> = ({ durF }) => {
  const f = useCurrentFrame();
  const door = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: ease });
  const temp = interpolate(f, [8, durF * 0.9], [0.15, 0.85], clamp);
  return (
    <Stage>
      <rect x={70} y={20} width={180} height={360} rx={18} fill="#0d0d0f" />
      <line x1={70} y1={140} x2={250} y2={140} />
      {[200, 260, 320].map((y) => <line key={y} x1={90} y1={y} x2={230} y2={y} strokeWidth={5} opacity={0.6} />)}
      <rect x={100} y={165} width={40} height={35} rx={6} fill="#3a3a3a" stroke="none" />
      <circle cx={185} cy={240} r={18} fill="#3a3a3a" stroke="none" />
      <rect x={160} y={280} width={50} height={40} rx={6} fill="#3a3a3a" stroke="none" />
      {/* open door, swinging out */}
      <path d={`M250 20 L${250 + 70 * door} ${36 - 10 * door} L${250 + 70 * door} ${364 + 10 * door} L250 380 Z`} fill="#161618" />
      {/* thermometer */}
      <rect x={322} y={60} width={36} height={250} rx={18} fill="#111" />
      <circle cx={340} cy={330} r={30} fill={ALERT} stroke="none" />
      <rect x={332} y={70 + 230 * (1 - temp)} width={16} height={230 * temp + 10} rx={8} fill={temp > 0.5 ? ALERT : ACCENT} stroke="none" />
    </Stage>
  );
};

const Faucet: React.FC<{ durF: number }> = ({ durF }) => {
  const f = useCurrentFrame();
  const needle = interpolate(f, [4, durF * 0.8], [-40, -170], { ...clamp, easing: ease });
  const drops = [0, 18, 42].map((start, k) => {
    const y = interpolate(f, [start, start + 14], [175, 330], clamp);
    const vis = f >= start && f < start + 14;
    return vis ? <ellipse key={k} cx={95} cy={y} rx={10} ry={14} fill="#8fd3ff" stroke="none" /> : null;
  });
  return (
    <Stage glow="rgba(143,211,255,0.3)">
      <path d="M260 60 H120 C90 60 80 80 80 105 V150" strokeWidth={26} />
      <rect x={230} y={30} width={60} height={30} rx={8} fill={INK} stroke="none" />
      <line x1={260} y1={20} x2={260} y2={30} strokeWidth={14} />
      {drops}
      <path d="M30 340 H170" strokeWidth={8} opacity={0.6} />
      {/* pressure gauge */}
      <g transform="translate(290 300)">
        <path d="M-80 0 A80 80 0 0 1 80 0" strokeWidth={10} />
        <path d="M-80 0 A80 80 0 0 1 -56 -56" stroke={ALERT} strokeWidth={10} />
        <line x1={0} y1={0} x2={64 * Math.cos((needle * Math.PI) / 180)} y2={64 * Math.sin((needle * Math.PI) / 180)} stroke={ACCENT} strokeWidth={9} />
        <circle r={12} fill={INK} stroke="none" />
      </g>
    </Stage>
  );
};

const Calendar: React.FC<{ hitF: number }> = ({ hitF }) => {
  const f = useCurrentFrame();
  const n = Math.max(1, Math.round(interpolate(f, [4, hitF], [1, 22], { ...clamp, easing: Easing.in(Easing.quad) })));
  const pop = spring({ frame: f - hitF, fps: 30, config: { damping: 10 }, durationInFrames: 12 });
  const s = f >= hitF ? interpolate(pop, [0, 1], [1.25, 1]) : 1;
  return (
    <Stage glow="rgba(255,90,54,0.35)">
      <rect x={70} y={50} width={260} height={300} rx={26} fill="#111" />
      <path d="M70 120 H330" />
      <rect x={75} y={55} width={250} height={62} rx={20} fill={ALERT} stroke="none" />
      <line x1={140} y1={30} x2={140} y2={80} strokeWidth={14} />
      <line x1={260} y1={30} x2={260} y2={80} strokeWidth={14} />
      <text x={200} y={275} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={150} fill={INK} stroke="none"
        transform={`translate(200 230) scale(${s}) translate(-200 -230)`}>
        {n}
      </text>
      <text x={200} y={325} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={34} fill={ACCENT} stroke="none" letterSpacing={6}>
        {n === 1 ? "DIA" : "DIAS"}
      </text>
    </Stage>
  );
};

const Label: React.FC<{ text: string; atF: number }> = ({ text, atF }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [atF, atF + 8], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        top: 470,
        left: SAFE.left,
        width: SAFE_W,
        display: "flex",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      <div
        style={{
          maxWidth: SAFE_W,
          padding: "12px 26px",
          borderRadius: 16,
          background: "rgba(10,10,10,0.78)",
          border: "2px solid rgba(255,179,0,0.7)",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 38,
          lineHeight: 1.25,
          color: "#fff",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Everything that belongs to one shot, on top of the city. Frame 0 = shot.t
export const ShotLayer: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durF = Math.round((shot.end - shot.t) * fps);
  const artF = shot.artT !== undefined ? Math.round((shot.artT - shot.t) * fps) : durF;
  const slide = shot.in === "whip" ? interpolate(f, [0, 6], [500, 0], { ...clamp, easing: ease }) : 0;
  const a = shot.art;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${slide}px)` }}>
        {a === "traffic" && <Traffic />}
        {a === "card" && <Card />}
        {a === "hospital" && <Hospital />}
        {a === "call" && <Call />}
        {a === "chart17" && <Chart17 />}
        {a === "tower" && <Tower durF={durF} />}
        {a === "nosignal" && <NoSignal goneAt={artF / fps} />}
        {a === "fridge" && <Fridge durF={durF} />}
        {a === "faucet" && <Faucet durF={durF} />}
        {a === "calendar" && <Calendar hitF={artF} />}
        {a === "cta" && <CTA at={artF / fps} />}
      </div>
      {shot.label && <Label text={shot.label.text} atF={Math.round((shot.label.t - shot.t) * fps)} />}
    </div>
  );
};
