"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  BUNDLE,
  FLAVORS,
  type FlavorId,
  type SizeId,
  getFlavor,
  unitPrice,
} from "./products";

/* ------------------------------------------------------------------ */
/* Cart                                                                 */
/* ------------------------------------------------------------------ */

export interface CartLine {
  key: string;
  kind: "jar" | "bundle";
  flavorId?: FlavorId;
  size?: SizeId;
  subscribe?: boolean;
  qty: number;
}

export function lineKey(l: Omit<CartLine, "key" | "qty">): string {
  return l.kind === "bundle"
    ? BUNDLE.id
    : `${l.flavorId}:${l.size}:${l.subscribe ? "sub" : "once"}`;
}

export function linePrice(l: CartLine): number {
  if (l.kind === "bundle") return BUNDLE.price;
  return unitPrice(getFlavor(l.flavorId ?? "ember"), l.size ?? "8oz", l.subscribe);
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, qty = 1) =>
        set((s) => {
          const key = lineKey(line);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.key === key ? { ...l, qty: Math.min(l.qty + qty, 24) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, key, qty }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.key !== key)
              : s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, 24) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "fervor-cart-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  Math.round(lines.reduce((n, l) => n + linePrice(l) * l.qty, 0) * 100) / 100;

/* ------------------------------------------------------------------ */
/* UI                                                                   */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  color?: string;
}

export interface Flight {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface UIState {
  cartOpen: boolean;
  menuOpen: boolean;
  introDone: boolean;
  sceneReady: boolean;
  webgl: boolean | null;
  /** Flavor chosen in the shop configurator. */
  shopFlavor: FlavorId;
  /** Flavor currently shown on the 3D jar (driven by scroll + shop). */
  jarFlavor: FlavorId;
  cartBump: number;
  toasts: Toast[];
  flights: Flight[];
  setCartOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setIntroDone: () => void;
  setSceneReady: () => void;
  setWebgl: (v: boolean) => void;
  setShopFlavor: (id: FlavorId) => void;
  setJarFlavor: (id: FlavorId) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  launchFlight: (f: Omit<Flight, "id">) => void;
  landFlight: (id: number) => void;
  bumpCart: () => void;
}

let uid = 0;

export const useUI = create<UIState>()((set) => ({
  cartOpen: false,
  menuOpen: false,
  introDone: false,
  sceneReady: false,
  webgl: null,
  shopFlavor: FLAVORS[0].id,
  jarFlavor: FLAVORS[0].id,
  cartBump: 0,
  toasts: [],
  flights: [],
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setIntroDone: () => set({ introDone: true }),
  setSceneReady: () => set({ sceneReady: true }),
  setWebgl: (webgl) => set({ webgl }),
  setShopFlavor: (shopFlavor) => set({ shopFlavor }),
  setJarFlavor: (jarFlavor) => set((s) => (s.jarFlavor === jarFlavor ? s : { jarFlavor })),
  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id: ++uid }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  launchFlight: (f) => set((s) => ({ flights: [...s.flights, { ...f, id: ++uid }] })),
  landFlight: (id) =>
    set((s) => ({
      flights: s.flights.filter((f) => f.id !== id),
      cartBump: s.cartBump + 1,
    })),
  bumpCart: () => set((s) => ({ cartBump: s.cartBump + 1 })),
}));
