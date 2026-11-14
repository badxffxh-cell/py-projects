import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, CaptionPage, FONT, SAFE, SAFE_W } from "./constants";

const SIZE = 64; // tamanho padrão pedido
const TOP = 1150; // centro vertical da legenda, dentro da zona segura (250..1570)

const Line: React.FC<{ page: CaptionPage; t: number; stroke: boolean }> = ({ page, t, stroke }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignContent: "center",
      gap: "0 18px",
    }}
  >
    {page.words.map((w, i) => {
      const active = t >= w.start && t < (page.words[i + 1]?.start ?? page.end);
      return (
        <span
          key={i}
          style={{
            color: stroke ? "transparent" : active ? ACCENT : "#fff",
            WebkitTextStroke: stroke ? "14px #000" : undefined,
          }}
        >
          {w.text.replace(/[.,…]$/, "")}
        </span>
      );
    })}
  </div>
);

export const Captions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const page = pages.find((p) => t >= p.start && t < p.end);
  if (!page) return null;
  const since = frame - Math.round(page.start * fps);
  const pop = spring({ frame: since, fps, config: { damping: 14, stiffness: 220 }, durationInFrames: 8 });

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE_W,
        top: TOP - SIZE * 1.2, // caixa de 2 linhas no máximo
        height: SIZE * 1.2 * 2,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: SIZE,
        lineHeight: 1.2,
        textTransform: "uppercase",
        textAlign: "center",
        transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
      }}
    >
      <Line page={page} t={t} stroke />
      <Line page={page} t={t} stroke={false} />
    </div>
  );
};

