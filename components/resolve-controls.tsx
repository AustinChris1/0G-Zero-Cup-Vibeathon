"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { shortHash } from "@/lib/utils";

export function ResolveControls({
  matchId,
  homeCode,
  awayCode,
}: {
  matchId: string;
  homeCode: string;
  awayCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState(1);
  const [away, setAway] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");

  async function settle() {
    setBusy(true);
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, home, away }),
      });
      const data = await res.json();
      if (res.ok) {
        setTx(data.settlementTx);
        setTimeout(() => router.refresh(), 1400);
      }
    } finally {
      setBusy(false);
    }
  }

  if (tx) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border border-[#4ade80]/40 bg-[#4ade80]/5 px-3 py-2 font-mono text-[0.68rem] text-[#4ade80]"
      >
        ✓ Settled on 0G Chain · {shortHash(tx, 10, 6)} · scoring every pick…
      </motion.div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[0.62rem] uppercase tracking-widest text-muted underline-offset-2 hover:text-acid hover:underline"
      >
        demo · simulate a result
      </button>
    );
  }

  return (
    <div className="border border-ink-line bg-ink p-3">
      <div className="tag mb-2 text-muted">Demo control · settle this match</div>
      <div className="flex items-center gap-2">
        <Score label={homeCode} value={home} setValue={setHome} />
        <span className="font-mono text-muted">–</span>
        <Score label={awayCode} value={away} setValue={setAway} />
        <button
          onClick={settle}
          disabled={busy}
          className="btn-acid ml-auto rounded px-3 py-2 text-[0.62rem] disabled:opacity-60"
        >
          {busy ? "Settling…" : "Settle"}
        </button>
      </div>
    </div>
  );
}

function Score({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[0.62rem] text-muted">{label}</span>
      <input
        type="number"
        min={0}
        max={9}
        value={value}
        onChange={(e) => setValue(Math.max(0, Math.min(9, Number(e.target.value))))}
        className="w-12 border border-ink-line bg-ink-soft px-2 py-1 text-center font-mono text-sm text-chalk outline-none focus:border-acid"
      />
    </div>
  );
}
