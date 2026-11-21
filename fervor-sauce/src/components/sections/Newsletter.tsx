"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckIcon, FlameIcon } from "../ui/Icons";
import { EASE_OUT_EXPO } from "../ui/Motion";
import { RevealText } from "../ui/RevealText";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "sending" | "done">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email)) {
      setState("error");
      return;
    }
    setState("sending");
    window.setTimeout(() => setState("done"), 900);
  };

  return (
    <section id="join" className="relative z-20 overflow-hidden bg-ink" aria-labelledby="join-title">
      <div aria-hidden className="absolute inset-0 tex-charcoal" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_68%,rgb(255_91_31/0.24),transparent_75%)]" />
      <div className="relative mx-auto max-w-[1600px] px-5 py-28 text-center md:px-8 md:py-40">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-flame">(The heat list)</p>
        <RevealText
          as="h2"
          id="join-title"
          text={"Get first dibs\non the *next fire.*"}
          className="mx-auto mt-5 font-display text-[clamp(3rem,8.4vw,8.4rem)] uppercase leading-[0.86] tracking-[-0.02em]"
          accentClassName="font-serif italic normal-case tracking-normal text-flame"
        />
        <p className="mx-auto mt-7 max-w-md text-cream/70">
          Limited batches sell out in days. Join the list for early access, kitchen recipes and 10% off your first
          order.
        </p>

        <div className="mx-auto mt-10 max-w-xl">
          <AnimatePresence mode="wait" initial={false}>
            {state === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                className="flex items-center justify-center gap-4 rounded-full bg-flame px-6 py-5 text-ink"
                role="status"
              >
                <motion.span
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.15 }}
                  className="grid size-9 place-items-center rounded-full bg-ink text-flame"
                >
                  <CheckIcon />
                </motion.span>
                <span className="text-left text-sm font-medium">
                  You&apos;re on the list. Check your inbox for 10% off — and a recipe for the perfect breakfast taco.
                </span>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                exit={{ opacity: 0, y: -10 }}
                className="group relative flex items-center rounded-full bg-cream/[0.06] p-2 ring-1 ring-inset ring-cream/15 transition focus-within:ring-flame"
              >
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <FlameIcon size={18} className="ml-4 shrink-0 text-flame" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  aria-invalid={state === "error"}
                  aria-describedby="email-msg"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-cream placeholder:text-cream/35 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-flame px-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink transition hover:bg-cream disabled:opacity-70 md:px-7"
                >
                  {state === "sending" ? "Joining…" : "Join"}
                  <ArrowRight size={16} />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
          <p id="email-msg" className="mt-3 h-4 text-xs text-flame" aria-live="polite">
            {state === "error" ? "That email doesn’t look quite right." : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
