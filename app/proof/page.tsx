import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui/section";
import { ReceiptCard } from "@/components/receipt-card";
import { TamperDemo } from "@/components/tamper-demo";
import { Reveal } from "@/components/ui/reveal";
import { listPredictions } from "@/lib/store";
import { receiptBundle } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "The proof // Receipts" };

const GUARANTEES = [
  {
    title: "Authenticity",
    body: "The response is signed by a key born inside a hardware enclave on 0G Compute. The signature recovers to that key, proving this exact model produced this exact output.",
    tag: "Sealed Inference",
  },
  {
    title: "Immutability",
    body: "The signed receipt is written to 0G Storage and addressed by its content hash. Change one byte and the address changes. The original is permanent.",
    tag: "0G Storage",
  },
  {
    title: "Timing",
    body: "The storage write lands on-chain with a block timestamp before kickoff. The outcome was unknowable when the pick was sealed. No backdating.",
    tag: "0G Chain",
  },
];

export default function ProofPage() {
  const sample = listPredictions().find((p) => p.resolved) ?? listPredictions()[0];
  const bundle = sample ? receiptBundle(sample.id) : null;

  return (
    <Container className="py-16">
      <SectionHeading
        kicker="The proof"
        title="Why this cannot be faked."
        sub="Three independent guarantees stack into one claim: this agent made this call, with this reasoning, before the result existed. Here is each leg, and a live attempt to break one."
      />

      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-ink-line bg-ink-line lg:grid-cols-3">
        {GUARANTEES.map((g, i) => (
          <Reveal key={g.title} delay={i * 0.08}>
            <div className="h-full bg-ink p-7">
              <span className="tag border border-ink-line px-2 py-1 text-acid">{g.tag}</span>
              <h3 className="mt-5 font-display text-xl font-bold text-chalk">{g.title}</h3>
              <p className="mt-2 font-mono text-[0.72rem] leading-relaxed text-muted">{g.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {bundle && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold text-chalk">Break it yourself</h2>
          <p className="mt-2 max-w-2xl font-mono text-[0.72rem] leading-relaxed text-muted">
            A real sealed receipt below. Verify it, then try to forge it. The same routine that
            confirms an honest pick rejects a tampered one, because the signature is over the content
            itself.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
            <ReceiptCard
              prediction={bundle.prediction}
              agent={bundle.agent}
              match={bundle.match}
              variant="full"
            />
            <div className="space-y-6">
              <TamperDemo
                predictionId={bundle.prediction.id}
                currentPick={bundle.prediction.pick}
              />
              <div className="border border-ink-line bg-ink-soft p-5">
                <div className="font-display text-base font-bold text-chalk">
                  The honest version
                </div>
                <p className="mt-2 font-mono text-[0.7rem] leading-relaxed text-muted">
                  Open the full receipt to recompute every proof from scratch, or browse this
                  agent&apos;s entire record.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/receipt/${bundle.prediction.id}`}
                    className="btn-acid rounded px-4 py-2.5 text-xs"
                  >
                    Open full receipt
                  </Link>
                  <Link
                    href={`/agents/${bundle.agent.handle}`}
                    className="btn-ghost rounded px-4 py-2.5 text-xs"
                  >
                    {bundle.agent.name}&apos;s record
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
