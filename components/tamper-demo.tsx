"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Outcome } from "@/lib/types";
import type { VerifyResult } from "@/lib/og/verify";
import { cn } from "@/lib/utils";

export function TamperDemo({
  predictionId,
  currentPick,
}: {
  predictionId: string;
  currentPick: Outcome;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [attempted, setAttempted] = useState<string>("");

  async function attack() {
    setBusy(true);
    setResult(null);
    try {
      const target: Outcome = currentPick === "HOME" ? "AWAY" : "HOME";
      const [data] = await Promise.all([
        fetch("/api/tamper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ predictionId, newPick: target }),
        }).then((r) => r.json()),
        new Promise((r) => setTimeout(r, 700)),
      ]);
      setResult(data.result);
      setAttempted(data.attemptedPick);
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-2 border-dashed border-seal/40 bg-seal/[0.03] p-5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-seal">
          ⚠ Attack this receipt
        </span>
      </div>
      <p className="mt-2 font-mono text-[0.72rem] leading-relaxed text-muted">
        Try to cheat. We will secretly rewrite this sealed pick to the opposite outcome and run the
        exact same independent verifier an auditor would. Watch what happens.
      </p>
      <button
        onClick={attack}
        disabled={busy}
        className="mt-4 w-full border-2 border-seal bg-seal/10 px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-seal transition hover:bg-seal hover:text-ink disabled:opacity-60"
      >
        {busy ? "Forging…" : "Forge the outcome →"}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-2 border-seal/60 bg-seal/5 p-3">
              <div className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-seal">
                ✕ Forgery rejected · pick flipped to {attempted}
              </div>
              <ul className="space-y-2">
                {result.steps.map((s, i) => (
                  <motion.li
                    key={s.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <span className={cn("font-mono text-sm leading-none", s.ok ? "text-[#4ade80]" : "text-seal")}>
                      {s.ok ? "✓" : "✕"}
                    </span>
                    <span>
                      <span className="font-mono text-[0.72rem] font-semibold text-chalk">
                        {s.label}
                      </span>
                      <span className="block font-mono text-[0.68rem] text-muted">{s.detail}</span>
                    </span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-3 font-mono text-[0.68rem] text-muted">
                The signed digest no longer matches the altered content. There is no private key to
                re-sign with. The only honest move is to leave the original pick exactly as sealed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
