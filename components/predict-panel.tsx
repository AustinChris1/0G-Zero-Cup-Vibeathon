"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Agent, Match, Prediction } from "@/lib/types";
import { ReceiptCard } from "@/components/receipt-card";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";

const STEPS = [
  "Running Sealed Inference on 0G Compute",
  "Signing the response inside the TEE enclave",
  "Writing the sealed receipt to 0G Storage",
  "Timestamping pre-kickoff on 0G Chain",
];

export function PredictPanel({ match, agents }: { match: Match; agents: Agent[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Agent | null>(agents[0] ?? null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"idle" | "sealing" | "done" | "error">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState("");

  const q = query.trim().toLowerCase();
  const shown = q
    ? agents.filter((a) => a.name.toLowerCase().includes(q) || a.handle.toLowerCase().includes(q))
    : agents;

  useEffect(() => {
    if (phase !== "sealing") return;
    setStep(0);
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 380 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  async function seal() {
    if (!selected) return;
    setError("");
    setPhase("sealing");
    try {
      const [data] = await Promise.all([
        fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: selected.id, matchId: match.id }),
        }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
        new Promise((r) => setTimeout(r, STEPS.length * 380 + 250)),
      ]);
      if (!data.ok) {
        setError(data.j.error || "Could not seal the pick.");
        setPhase("error");
        return;
      }
      setResult(data.j.prediction);
      setPhase("done");
    } catch {
      setError("Network error.");
      setPhase("error");
    }
  }

  function close() {
    setPhase("idle");
    setResult(null);
    router.refresh();
  }

  if (agents.length === 0) {
    return (
      <div className="border border-dashed border-ink-line p-4 text-center font-mono text-xs text-muted">
        Every agent has already sealed a pick for this match.
      </div>
    );
  }

  return (
    <>
      <div className="border border-ink-line bg-ink-soft p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="tag text-muted">Run an agent on this match</span>
          <span className="font-mono text-[0.58rem] text-muted">{agents.length} available</span>
        </div>
        {agents.length > 6 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter agents…"
            className="mb-2 w-full border border-ink-line bg-ink px-3 py-2 font-mono text-xs text-chalk outline-none placeholder:text-muted/60 focus:border-acid"
          />
        )}
        <div className="mb-4 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
          {shown.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={cn(
                "flex shrink-0 items-center gap-2 border px-3 py-2 transition",
                selected?.id === a.id
                  ? "border-acid bg-acid/10"
                  : "border-ink-line hover:border-muted",
              )}
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-sm text-xs"
                style={{ background: a.accent, color: "#0b0c0e" }}
              >
                {a.glyph}
              </span>
              <span className="whitespace-nowrap font-mono text-xs text-chalk">{a.name}</span>
            </button>
          ))}
          {shown.length === 0 && (
            <span className="px-1 py-2 font-mono text-xs text-muted">No agent matches &ldquo;{query}&rdquo;.</span>
          )}
        </div>
        <button
          onClick={seal}
          disabled={!selected}
          className="btn-acid w-full rounded px-4 py-3 text-xs disabled:opacity-50"
        >
          Seal {selected?.name ?? "agent"}&apos;s pick →
        </button>
      </div>

      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/90 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget && phase !== "sealing") close();
            }}
          >
            {(phase === "sealing" || phase === "error") && (
              <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                  <div className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-acid">
                    Sealing on 0G
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold">
                    <Flag team={match.home} /> {match.home.code} v {match.away.code}{" "}
                    <Flag team={match.away} />
                  </div>
                </div>
                <div className="space-y-3">
                  {STEPS.map((label, i) => {
                    const status = i < step ? "done" : i === step ? "active" : "wait";
                    return (
                      <div
                        key={label}
                        className={cn(
                          "flex items-center gap-3 border px-4 py-3 font-mono text-xs transition-colors",
                          status === "done" && "border-[#4ade80]/40 text-chalk",
                          status === "active" && "border-acid text-chalk",
                          status === "wait" && "border-ink-line text-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.6rem]",
                            status === "done" && "border-[#4ade80] text-[#4ade80]",
                            status === "active" && "border-acid text-acid",
                            status === "wait" && "border-ink-line",
                          )}
                        >
                          {status === "done" ? "✓" : i + 1}
                        </span>
                        {label}
                        {status === "active" && (
                          <motion.span
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-acid"
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {phase === "error" && (
                  <div className="mt-4">
                    <div className="border border-seal/50 bg-seal/10 px-3 py-2 font-mono text-xs text-seal">
                      {error}
                    </div>
                    <button onClick={close} className="btn-ghost mt-3 w-full rounded px-4 py-2 text-xs">
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}

            {phase === "done" && result && selected && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 2.2, rotate: -24, opacity: 0 }}
                  animate={{ scale: 1, rotate: -12, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 12 }}
                  className="pointer-events-none absolute -right-3 -top-5 z-20 border-[3px] border-seal px-3 py-1 font-mono text-sm font-bold uppercase tracking-widest text-seal"
                  style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.25)" }}
                >
                  Sealed ✓
                </motion.div>
                <ReceiptCard prediction={result} agent={selected} match={match} variant="full" />
                <button onClick={close} className="btn-ghost mt-4 w-full rounded px-4 py-3 text-xs">
                  Done · back to fixtures
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
