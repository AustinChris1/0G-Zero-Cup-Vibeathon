"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PRESETS = [
  {
    name: "Underdog Hunter",
    strategy:
      "Fade the favourites and hunt upsets. I look for dark horses the public is sleeping on and back contrarian value in tight knockout games.",
  },
  {
    name: "Model Maxi",
    strategy:
      "Pure data and expected goals. I price every match on shot quality and calibrated probability, ignoring narrative and hype completely.",
  },
  {
    name: "Total Chaos",
    strategy:
      "Vibes only, no spreadsheet. Pure gut on the energy of the tournament, taking wild swings the models would never make.",
  },
  {
    name: "Draw Specialist",
    strategy:
      "Cagey, low-scoring, defensive football wins knockouts. I value the draw heavily and fade open attacking shootouts.",
  },
];

export function CreateAgent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function applyPreset(p: (typeof PRESETS)[number]) {
    setName(p.name);
    setStrategy(p.strategy);
    setError("");
  }

  async function submit() {
    setError("");
    if (name.trim().length < 2) return setError("Give your agent a name.");
    if (strategy.trim().length < 20) return setError("Describe the strategy in a bit more detail.");
    setBusy(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, strategy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/agents/${data.agent.handle}?new=1`);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="border border-ink-line bg-ink-soft p-6">
        <label className="tag mb-2 block text-muted">Agent name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. The Bracket Buster"
          className="w-full border border-ink-line bg-ink px-4 py-3 font-display text-lg text-chalk outline-none transition focus:border-acid"
        />

        <label className="tag mb-2 mt-6 block text-muted">Strategy (plain language)</label>
        <p className="mb-2 font-mono text-[0.68rem] text-muted">
          This becomes the agent&apos;s reasoning brain. Describe how it should think and it will
          forecast in that style, every pick signed in a 0G enclave.
        </p>
        <textarea
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          rows={5}
          maxLength={400}
          placeholder="Describe how this agent picks games…"
          className="w-full resize-none border border-ink-line bg-ink px-4 py-3 font-mono text-sm leading-relaxed text-chalk outline-none transition focus:border-acid"
        />
        <div className="mt-1 text-right font-mono text-[0.62rem] text-muted">
          {strategy.length}/400
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 border border-seal/50 bg-seal/10 px-3 py-2 font-mono text-xs text-seal"
          >
            {error}
          </motion.div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="btn-acid mt-6 w-full rounded px-6 py-4 text-sm disabled:opacity-60"
        >
          {busy ? "Minting agent…" : "Create agent →"}
        </button>
      </div>

      <div>
        <div className="tag mb-3 text-muted">Or start from a template</div>
        <div className="space-y-3">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={cn(
                "block w-full border border-ink-line bg-ink-soft p-4 text-left transition hover:border-acid",
                name === p.name && "border-acid",
              )}
            >
              <div className="font-display text-sm font-bold text-chalk">{p.name}</div>
              <div className="mt-1 line-clamp-2 font-mono text-[0.68rem] text-muted">
                {p.strategy}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-4 font-mono text-[0.65rem] leading-relaxed text-muted">
          Once created, take your agent to any upcoming fixture and seal a pick. From that moment it
          is permanent and public. You cannot edit it, hide it, or delete a bad call.
        </p>
      </div>
    </div>
  );
}
