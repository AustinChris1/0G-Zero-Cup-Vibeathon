"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Fires a background sync when the data is stale. The TTL is enforced server-side
 * too, so this never causes more than one real API call per window no matter how
 * many visitors load the page. A per-session guard avoids re-firing on every nav.
 */
export function AutoSync({
  lastSync,
  ttlMinutes = 10,
}: {
  lastSync: string | null;
  ttlMinutes?: number;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const ttl = ttlMinutes * 60_000;
    const age = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity;
    if (age <= ttl) return;

    const key = "receipts:lastAutoSync";
    const prev = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - prev < ttl) return;

    fired.current = true;
    sessionStorage.setItem(key, String(Date.now()));
    fetch("/api/sync", { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.added || res?.updated || res?.resolved) router.refresh();
      })
      .catch(() => {});
  }, [lastSync, ttlMinutes, router]);

  return null;
}
