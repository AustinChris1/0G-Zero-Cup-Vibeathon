"use client";

import Link from "next/link";
import type { Agent, Match, Prediction } from "@/lib/types";
import { ProbBar } from "@/components/ui/prob-bar";
import { Barcode } from "@/components/ui/barcode";
import { Flag } from "@/components/ui/flag";
import { VerifyButton } from "@/components/verify-button";
import { cn, formatKickoff, shortHash } from "@/lib/utils";

function pickName(p: Prediction, m: Match) {
  if (p.pick === "HOME") return m.home.name;
  if (p.pick === "AWAY") return m.away.name;
  return "Draw";
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-ink/20 py-1.5">
      <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-wider text-ink/50">
        {label}
      </span>
      <span className="truncate font-mono text-[0.7rem] text-ink/90">{value}</span>
    </div>
  );
}

export function ReceiptCard({
  prediction,
  agent,
  match,
  variant = "feed",
  showVerify = true,
}: {
  prediction: Prediction;
  agent: Agent;
  match: Match;
  variant?: "feed" | "full";
  showVerify?: boolean;
}) {
  const { seal } = prediction;
  const won = prediction.resolved && prediction.correct;
  const lost = prediction.resolved && prediction.correct === false;

  return (
    <div className={cn("group relative", variant === "full" ? "max-w-md" : "")}>
      <div className="relative">
        {/* the paper stub */}
        <div className="receipt grain perf-top perf-bottom relative overflow-hidden border-x border-ink/10 px-5 pb-5 pt-6 text-ink shadow-[7px_7px_0_0_#0b0c0e] transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-[-2px]">
          {/* accent edge */}
          <div className="absolute left-0 top-0 h-full w-1" style={{ background: agent.accent }} />

          {/* header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ink/60">
                Receipts // sealed pick
              </div>
              <div className="font-mono text-[0.62rem] text-ink/40">
                No. {prediction.id.replace("rcpt_", "").toUpperCase()}
              </div>
            </div>
            <div className="stamp rotate-[-9deg] px-2 py-1 text-[0.6rem] text-seal">
              {seal.mode === "live" ? "TEE SEALED" : "SEALED"}
            </div>
          </div>

          {/* agent */}
          <Link
            href={`/agents/${agent.handle}`}
            className="mt-4 flex items-center gap-2 hover:opacity-70"
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-sm text-sm"
              style={{ background: agent.accent }}
            >
              {agent.glyph}
            </span>
            <span className="font-display text-sm font-bold text-ink">{agent.name}</span>
            <span className="font-mono text-[0.62rem] text-ink/40">@{agent.handle}</span>
          </Link>

          {/* fixture */}
          <div className="mt-4 border-y border-dashed border-ink/25 py-3">
            <div className="mb-1 font-mono text-[0.6rem] uppercase tracking-widest text-ink/50">
              {match.stage} // {formatKickoff(match.kickoff)}
            </div>
            <div className="flex items-center justify-between gap-2 font-display text-base font-bold">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <Flag team={match.home} className="shrink-0" />
                <span className="min-w-0 break-words">{match.home.name}</span>
              </span>
              <span className="shrink-0 px-1 text-ink/40">v</span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right">
                <span className="min-w-0 break-words">{match.away.name}</span>
                <Flag team={match.away} className="shrink-0" />
              </span>
            </div>
            {match.status === "RESOLVED" && match.result && (
              <div className="mt-1 text-center font-mono text-[0.7rem] text-ink/60">
                full time {match.result.home} – {match.result.away}
              </div>
            )}
          </div>

          {/* the call */}
          <div className="mt-4">
            <div className="font-mono text-[0.6rem] uppercase tracking-widest text-ink/50">
              The call
            </div>
            <div className="mt-1 flex items-end justify-between">
              <span className="bg-ink px-2 py-1 font-display text-lg font-bold leading-none text-paper">
                {pickName(prediction, match)}
              </span>
              <span className="font-mono text-2xl font-bold leading-none text-ink">
                {Math.round(prediction.confidence * 100)}
                <span className="text-sm text-ink/50">%</span>
              </span>
            </div>
            <div className="mt-3">
              <ProbBar
                probs={prediction.probs}
                pick={prediction.pick}
                homeCode={match.home.code}
                awayCode={match.away.code}
              />
            </div>
          </div>

          {/* reasoning */}
          <p
            className={cn(
              "mt-4 font-mono text-[0.72rem] leading-relaxed text-ink/75",
              variant === "feed" && "line-clamp-3",
            )}
          >
            {prediction.reasoning}
          </p>

          {/* proof block */}
          <div className="mt-4">
            <div className="mb-1 font-mono text-[0.6rem] uppercase tracking-widest text-ink/50">
              Cryptographic seal
            </div>
            <KV label="model" value={prediction.model} />
            <KV label="signer" value={shortHash(seal.signer, 8, 6)} />
            <KV label="digest" value={shortHash(seal.payloadHash, 8, 6)} />
            <KV label="0g root" value={shortHash(seal.storageRoot, 8, 6)} />
            <KV label="storage tx" value={shortHash(seal.storageTx, 8, 6)} />
            <KV label="sealed" value={new Date(seal.sealedAt).toUTCString().replace("GMT", "UTC")} />
          </div>

          {/* result + verify */}
          <div className="mt-4 flex items-center justify-between">
            {prediction.resolved ? (
              <span
                className={cn(
                  "stamp px-2 py-1 text-[0.62rem]",
                  won ? "text-[#1c7d3f]" : "text-seal",
                )}
              >
                {won ? "WON" : "LOST"} · brier {prediction.brier?.toFixed(2)}
              </span>
            ) : (
              <span className="stamp rotate-[3deg] px-2 py-1 text-[0.62rem] text-ink/60">
                AWAITING KICKOFF
              </span>
            )}
            <Barcode seed={seal.payloadHash} />
          </div>

          {showVerify && <VerifyButton predictionId={prediction.id} className="mt-4" />}

          <div className="mt-4 flex items-center justify-between font-mono text-[0.58rem] text-ink/40">
            <span>thank you for forecasting honestly</span>
            <Link href={`/receipt/${prediction.id}`} className="underline hover:text-ink">
              open receipt →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
