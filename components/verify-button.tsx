"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VerifyResult } from "@/lib/og/verify";
import { cn } from "@/lib/utils";

export function VerifyButton({
  predictionId,
  className,
}: {
  predictionId: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function run() {
    setState("running");
    setResult(null);
    try {
      // brief beat so the scan animation reads as real work
      const [res] = await Promise.all([
        fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ predictionId }),
        }).then((r) => r.json()),
        new Promise((r) => setTimeout(r, 650)),
      ]);
      if (res?.result) {
        setResult(res.result);
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div className={className}>
      <button
        onClick={run}
        disabled={state === "running"}
        className={cn(
          "group relative w-full overflow-hidden border-2 border-ink bg-ink px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-paper transition",
          state === "idle" && "hover:bg-acid hover:text-ink",
        )}
      >
        {state === "running" && (
          <motion.span
            className="absolute inset-y-0 left-0 w-1/3 bg-acid/30"
            animate={{ x: ["-120%", "420%"] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          />
        )}
        <span className="relative">
          {state === "idle" && "Verify this receipt"}
          {state === "running" && "Recomputing proof…"}
          {state === "done" && (result?.ok ? "Re-run verification" : "Re-run verification")}
          {state === "error" && "Retry verification"}
        </span>
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-3 border-2 p-3",
                result.ok ? "border-[#4ade80]/60 bg-[#4ade80]/5" : "border-seal/60 bg-seal/5",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-xs font-bold uppercase tracking-widest",
                    result.ok ? "text-[#4ade80]" : "text-seal",
                  )}
                >
                  {result.ok ? "✓ Proof holds" : "✕ Proof broken"}
                </span>
                <span className="tag text-muted">independent re-check</span>
              </div>
              <ul className="space-y-2">
                {result.steps.map((s, i) => (
                  <motion.li
                    key={s.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex items-start gap-2"
                  >
                    <span
                      className={cn(
                        "mt-px font-mono text-sm leading-none",
                        s.ok ? "text-[#4ade80]" : "text-seal",
                      )}
                    >
                      {s.ok ? "✓" : "✕"}
                    </span>
                    <span className="min-w-0">
                      <span className="font-mono text-[0.72rem] font-semibold text-chalk">
                        {s.label}
                      </span>
                      <span className="block font-mono text-[0.68rem] leading-snug text-muted">
                        {s.detail}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
