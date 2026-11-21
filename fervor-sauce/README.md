# FERVOR — Small-Batch Fire Sauce

A premium, scroll-driven ecommerce landing page for a fictional gourmet sauce brand. A procedurally built,
photorealistic 3D sauce jar is the hero of the whole page: it floats with its lid open and steam rising, then
screws itself shut, travels between sections, bursts spices around its ingredients and burns its label away to
reveal each new flavor.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · React Three Fiber + drei ·
GSAP ScrollTrigger · Framer Motion · Lenis (smooth scroll) · Zustand (cart).

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
npm run lint
```

## What's on the page

| Section | Story beat | Highlights |
| --- | --- | --- |
| Preloader | Charring chiles… | Counter that waits for the WebGL scene to be genuinely ready, two-layer curtain wipe |
| Hero | The jar | Glass that refracts a giant WebGL wordmark, floating knurled lid, steam, orbiting spices, glass callout chips |
| Story | *fer·vor — to boil* | Sticky manifesto; words ignite as you scroll while the lid screws shut |
| Process | From fire to jar | Torn, ember-lit paper edges, scrubbed rules and numerals |
| Ingredients | Nothing to hide | Sticky spotlight, six ingredient cards ignite around the jar while spices burst outward |
| Flavors | Four ways to burn | Pinned 520vh theatre: stage colour floods, giant name re-sets letter by letter, the label **burns** into the next flavour |
| Shop | Configurator | Flavour swatches, size, subscribe & save, quantity, accordion — the 3D jar follows your selection and can be dragged to spin |
| Collection | All four | Tilting cards with cursor spotlight, quick-add, bundle offer |
| Reviews | Loved by heat people | Velocity-reactive marquees, press strip |
| Heat list | Newsletter | Validated form with animated success state |

Ecommerce layer: persistent cart (localStorage), fly-to-cart sprites, toasts, cart drawer with free-shipping
progress, upsell, focus trap and Escape to close. Checkout is intentionally a demo.

## How the 3D works

Everything is procedural — no model files, no HDRs, no image assets.

- **Jar** (`src/components/canvas/geometry.ts`): lathe profiles with real wall thickness, a punted base, thread
  rings and a rolled lip; a knurled steel lid with displaced geometry.
- **Glass**: `MeshPhysicalMaterial` transmission (IOR 1.5, dispersion, attenuation, double-sided).
  three.js clears its transmission buffer to 50% white on transparent canvases, which makes glass look milky
  over HTML; a far-plane "clear quad" (`shaders.ts`) resets empty pixels so the glass composites as clear glass
  with additive reflections over the DOM behind it.
- **Label**: drawn at runtime on a canvas with the page's own webfonts, plus an ORM map so the foil reads as
  metal. A patched physical material burns between two labels with a noisy, glowing flame front.
- **Sauce**: procedural simplex-noise shader — mottled body, seeds, chili flakes and oil sheen.
- **Lighting** (`Studio.tsx`): a dark studio of lightformers for long strip reflections, a cursor-following key
  light, a flickering orange "fire" bounce and a rim light; the environment orbits with the pointer.
- **Steam, embers, spices**: fbm shader planes, GPU-animated points, and instanced flakes/peppercorns/seeds/salt
  with cursor repulsion and scroll swirl.

### Scroll choreography

`src/lib/choreography.ts` defines a pose per section (desktop and mobile). Each section registers a
ScrollTrigger; every frame the scene folds the triggers' progress into one pose, so jumping anywhere on the
page always lands on the right pose. Rendering pauses entirely once the jar has left the page.

### Layering

The WebGL canvas is fixed at `z-10`, between section backgrounds (`z-0`), "behind the jar" typography (`z-5`)
and section content (`z-20`). Section roots never create stacking contexts, otherwise the canvas could not sit
between their layers. Pointer interaction with the jar is hit-tested against its projected screen bounds, so the
canvas itself never blocks the page.

## Accessibility and performance

- Semantic sections and headings, an `sr-only` h1, skip link, labelled controls, focus-visible styles.
- `prefers-reduced-motion` turns off smooth scrolling and scroll reveals, shortens the intro and slows the marquees.
- Quality tiers (texture size, particle counts, geometry detail) plus drei's `PerformanceMonitor` for DPR.
- Falls back to an SVG jar and DOM wordmark when WebGL is unavailable.

FERVOR is a fictional brand created for this concept.
