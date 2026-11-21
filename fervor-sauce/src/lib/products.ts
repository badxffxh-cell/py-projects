export type FlavorId = "ember" | "inferno" | "noir" | "solar";
export type SizeId = "8oz" | "16oz" | "trio";

export interface Flavor {
  id: FlavorId;
  index: number;
  name: string;
  descriptor: string;
  tagline: string;
  story: string;
  heat: 1 | 2 | 3 | 4 | 5;
  scoville: number;
  price: number;
  notes: string[];
  pairings: string[];
  ingredients: string;
  batch: string;
  /** Visual identity — consumed by the 3D jar and the 2D UI. */
  colors: {
    sauce: string;
    sauceDeep: string;
    seed: string;
    labelBg: string;
    labelInk: string;
    labelMuted: string;
    foil: string;
    stage: string;
    stageText: string;
    accent: string;
  };
}

export const FLAVORS: Flavor[] = [
  {
    id: "ember",
    index: 0,
    name: "Ember",
    descriptor: "Smoked Chipotle & Roasted Garlic",
    tagline: "Campfire in a jar.",
    story:
      "Morita chipotles smoked low over white oak, folded into whole heads of garlic roasted until they turn to jam. Deep, sweet, and quietly dangerous.",
    heat: 2,
    scoville: 2500,
    price: 14,
    notes: ["Oak smoke", "Caramelized garlic", "Molasses finish"],
    pairings: ["Brisket", "Breakfast tacos", "Charred corn"],
    ingredients:
      "Fire-roasted chipotle morita, roasted garlic, tomato, apple cider vinegar, raw wildflower honey, fleur de sel, toasted cumin.",
    batch: "027",
    colors: {
      sauce: "#8f2108",
      sauceDeep: "#3d0c03",
      seed: "#e9c79a",
      labelBg: "#0f0b09",
      labelInk: "#f3e8da",
      labelMuted: "#9c8b7f",
      foil: "#ff6a24",
      stage: "#0a0706",
      stageText: "#f7efe4",
      accent: "#ff5b1f",
    },
  },
  {
    id: "inferno",
    index: 1,
    name: "Inferno",
    descriptor: "Habanero & Blood Orange",
    tagline: "Bright. Loud. Unapologetic.",
    story:
      "Orange habaneros blistered whole, then cut with Sicilian blood orange and a hit of lime. The citrus arrives first — the fire takes its time.",
    heat: 4,
    scoville: 38000,
    price: 15,
    notes: ["Citrus zest", "Tropical fruit", "Slow-building fire"],
    pairings: ["Fish tacos", "Crispy wings", "Ceviche"],
    ingredients:
      "Orange habanero, blood orange juice, carrot, white onion, lime, cane vinegar, fleur de sel, garlic.",
    batch: "031",
    colors: {
      sauce: "#e0470b",
      sauceDeep: "#7a1a03",
      seed: "#ffd9a0",
      labelBg: "#ff5b1f",
      labelInk: "#0f0b09",
      labelMuted: "#5a1f0a",
      foil: "#1a1310",
      stage: "#ff5b1f",
      stageText: "#0a0706",
      accent: "#0a0706",
    },
  },
  {
    id: "noir",
    index: 2,
    name: "Noir",
    descriptor: "Black Garlic & Ancho",
    tagline: "Umami after dark.",
    story:
      "Garlic aged forty days until it turns black and sweet as balsamic, slow-cooked with ancho chiles and cacao nibs. Barely hot, endlessly deep.",
    heat: 1,
    scoville: 1000,
    price: 16,
    notes: ["Umami depth", "Dark cacao", "Balsamic tang"],
    pairings: ["Dry-aged steak", "Ramen", "Roasted mushrooms"],
    ingredients:
      "Black garlic, ancho chile, cacao nibs, tamari, aged balsamic, molasses, toasted sesame, fleur de sel.",
    batch: "019",
    colors: {
      sauce: "#2b1209",
      sauceDeep: "#0d0503",
      seed: "#d9b48a",
      labelBg: "#0b0908",
      labelInk: "#efe3d3",
      labelMuted: "#857467",
      foil: "#d6a15a",
      stage: "#060505",
      stageText: "#f7efe4",
      accent: "#d6a15a",
    },
  },
  {
    id: "solar",
    index: 3,
    name: "Solar",
    descriptor: "Scotch Bonnet & Mango",
    tagline: "Tropical heat, golden hour.",
    story:
      "Sun-ripe Alphonso mango meets scotch bonnet and fresh turmeric root. Floral, fruity, and glowing — like the last hour of a long summer day.",
    heat: 3,
    scoville: 12000,
    price: 15,
    notes: ["Ripe mango", "Fresh turmeric", "Floral heat"],
    pairings: ["Jerk chicken", "Rice bowls", "Wood-fired pizza"],
    ingredients:
      "Alphonso mango, scotch bonnet, fresh turmeric, ginger, passion fruit, cane vinegar, fleur de sel, allspice.",
    batch: "024",
    colors: {
      sauce: "#f08a0c",
      sauceDeep: "#8a3d02",
      seed: "#fff0c2",
      labelBg: "#f4e7d4",
      labelInk: "#140e0b",
      labelMuted: "#7d6a5a",
      foil: "#ff5b1f",
      stage: "#ff9126",
      stageText: "#0a0706",
      accent: "#0a0706",
    },
  },
];

export const SIZES: { id: SizeId; label: string; sub: string; multiplier: number; add: number }[] = [
  { id: "8oz", label: "8 oz", sub: "Single jar", multiplier: 1, add: 0 },
  { id: "16oz", label: "16 oz", sub: "Chef’s jar", multiplier: 1, add: 9 },
  { id: "trio", label: "3 × 8 oz", sub: "Stock up · save 10%", multiplier: 2.7, add: 0 },
];

export const BUNDLE = {
  id: "flight",
  name: "The Full Flight",
  descriptor: "All four sauces · 4 × 8 oz",
  price: 52,
  compareAt: 60,
};

export const FREE_SHIPPING_THRESHOLD = 40;
export const SUBSCRIBE_DISCOUNT = 0.15;

export function getFlavor(id: string): Flavor {
  return FLAVORS.find((f) => f.id === id) ?? FLAVORS[0];
}

export function unitPrice(flavor: Flavor, size: SizeId, subscribe = false): number {
  const s = SIZES.find((x) => x.id === size) ?? SIZES[0];
  const base = flavor.price * s.multiplier + s.add;
  const price = subscribe ? base * (1 - SUBSCRIBE_DISCOUNT) : base;
  return Math.round(price * 100) / 100;
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export const INGREDIENTS = [
  {
    id: "chipotle",
    name: "Chipotle Morita",
    role: "Smoke",
    origin: "Chihuahua, MX",
    note: "Ripe jalapeños smoked for days until leathery and plum-sweet.",
    icon: "chile",
  },
  {
    id: "habanero",
    name: "Orange Habanero",
    role: "Fire",
    origin: "Yucatán, MX",
    note: "Fruity, floral, ferocious. Picked fully ripe — never green.",
    icon: "pepper",
  },
  {
    id: "garlic",
    name: "Black Garlic",
    role: "Umami",
    origin: "Aged 40 days",
    note: "Slow-aged until molasses-dark. Sweet, savory, balsamic.",
    icon: "garlic",
  },
  {
    id: "orange",
    name: "Blood Orange",
    role: "Acidity",
    origin: "Sicily, IT",
    note: "Pressed the morning we cook. Bright, berried, a little bitter.",
    icon: "citrus",
  },
  {
    id: "honey",
    name: "Wildflower Honey",
    role: "Body",
    origin: "Raw · unfiltered",
    note: "Rounds the heat and carries the smoke across your palate.",
    icon: "honey",
  },
  {
    id: "salt",
    name: "Fleur de Sel",
    role: "Lift",
    origin: "Guérande, FR",
    note: "Hand-raked sea salt flakes that make every other note louder.",
    icon: "salt",
  },
] as const;

export const PROCESS = [
  {
    n: "01",
    title: "Source",
    body: "Single-origin chiles from three family farms. Picked ripe, shipped the same day, never frozen.",
    stat: "3 farms",
  },
  {
    n: "02",
    title: "Char",
    body: "Blistered over white-oak embers until the skins crack and the sugars turn to caramel.",
    stat: "480°C",
  },
  {
    n: "03",
    title: "Ferment",
    body: "Thirty days in open stoneware crocks. Wild, lactic, alive — that is where the depth comes from.",
    stat: "30 days",
  },
  {
    n: "04",
    title: "Jar",
    body: "Hand-filled in batches of 300, numbered by hand, sealed and shipped within the week.",
    stat: "300 jars",
  },
] as const;

export const REVIEWS = [
  { name: "Maya R.", flavor: "Ember", quote: "I put it on eggs, then on everything. The smoke is unreal.", stars: 5 },
  { name: "Daniel K.", flavor: "Inferno", quote: "Citrus first, then a slow wave of fire. My new wing sauce.", stars: 5 },
  { name: "Priya S.", flavor: "Noir", quote: "Tastes like a restaurant secret. Ridiculous on ramen.", stars: 5 },
  { name: "Tomás L.", flavor: "Solar", quote: "Mango and scotch bonnet is a dangerous combo. Bought six.", stars: 5 },
  { name: "Hannah W.", flavor: "Ember", quote: "Finally a sauce with flavor before heat. Gorgeous jar too.", stars: 5 },
  { name: "Leo M.", flavor: "Inferno", quote: "The blood orange thing should not work this well.", stars: 5 },
  { name: "Aiko T.", flavor: "Noir", quote: "Black garlic + steak. Life changing, no exaggeration.", stars: 5 },
  { name: "Sam O.", flavor: "Solar", quote: "Golden, floral, hot. Pizza night has a new MVP.", stars: 4 },
] as const;

export const PRESS = [
  "The Pantry Review",
  "HEAT QUARTERLY",
  "Salt & Smoke",
  "FIELD KITCHEN",
  "Brine Weekly",
  "The Condiment Club",
] as const;
