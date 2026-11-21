/** Animated film grain over everything (including the WebGL layer). */
export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.11] mix-blend-overlay">
      <div
        className="absolute -inset-[50%] animate-grain motion-reduce:animate-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px 220px",
        }}
      />
    </div>
  );
}
