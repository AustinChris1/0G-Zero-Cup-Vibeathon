"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { SyncResult } from "@/lib/sync";

export function SyncButton({ lastSync }: { lastSync: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res: SyncResult = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }).then((r) => r.json());
      if (res.ok) {
        setMsg({
          ok: true,
          text: `Synced ${res.fetched} fixtures · ${res.added} new, ${res.resolved} just settled`,
        });
        setTimeout(() => router.refresh(), 900);
      } else {
        setMsg({ ok: false, text: res.reason || "Sync unavailable." });
      }
    } catch {
      setMsg({ ok: false, text: "Sync failed. Still running on the seed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button onClick={sync} disabled={busy} className="btn-ghost rounded px-4 py-2 text-xs disabled:opacity-60">
        {busy ? "Syncing live data…" : "↻ Refresh live data now"}
      </button>
      <div className="font-mono text-[0.6rem] text-muted">
        {lastSync ? `auto-syncs · last ${new Date(lastSync).toLocaleString()}` : "showing curated data"}
      </div>
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`font-mono text-[0.62rem] ${msg.ok ? "text-[#4ade80]" : "text-seal"}`}
          >
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
