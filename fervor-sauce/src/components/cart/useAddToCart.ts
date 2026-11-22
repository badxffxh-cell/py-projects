import { useCallback } from "react";
import { type CartLine, useCart, useUI } from "@/lib/store";

type NewLine = Omit<CartLine, "key" | "qty">;

/** Adds to the cart, launches the fly-to-cart sprite and raises a toast. */
export function useAddToCart() {
  return useCallback(
    (line: NewLine, opts: { from?: Element | null; color: string; title: string; body?: string; qty?: number }) => {
      useCart.getState().add(line, opts.qty ?? 1);
      const ui = useUI.getState();
      if (opts.from) {
        const r = opts.from.getBoundingClientRect();
        ui.launchFlight({ x: r.left + r.width / 2, y: r.top + r.height / 2, color: opts.color });
      } else ui.bumpCart();
      ui.pushToast({ title: opts.title, body: opts.body, color: opts.color });
    },
    [],
  );
}
