"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUI, type Toast } from "@/lib/store";
import { CloseIcon, FlameIcon } from "../ui/Icons";
import { EASE_OUT_EXPO } from "../ui/Motion";

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-[66] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useUI((s) => s.dismissToast);
  const setCartOpen = useUI((s) => s.setCartOpen);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), 3600);
    return () => window.clearTimeout(id);
  }, [toast.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.3 } }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className="pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl bg-char/90 p-3 pr-2 text-cream shadow-2xl ring-1 ring-cream/10 backdrop-blur-xl"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{ background: toast.color ?? "var(--color-flame)" }}
      >
        <FlameIcon size={18} className="text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{toast.title}</p>
        {toast.body && <p className="truncate text-xs text-cream/60">{toast.body}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          setCartOpen(true);
          dismiss(toast.id);
        }}
        className="rounded-full bg-cream px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition hover:bg-flame"
      >
        View cart
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
        className="grid size-8 place-items-center rounded-full text-cream/60 transition hover:bg-cream/10 hover:text-cream"
      >
        <CloseIcon size={16} />
      </button>
      <motion.span
        className="absolute bottom-0 left-0 h-0.5 bg-flame"
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 3.6, ease: "linear" }}
      />
    </motion.div>
  );
}
