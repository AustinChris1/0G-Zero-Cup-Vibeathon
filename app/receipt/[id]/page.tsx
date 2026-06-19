import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/section";
import { ReceiptCard } from "@/components/receipt-card";
import { TamperDemo } from "@/components/tamper-demo";
import { receiptBundle } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const bundle = receiptBundle(params.id);
  if (!bundle) notFound();
  const { prediction, agent, match } = bundle;
  const { seal } = prediction;

  return (
    <Container className="py-12">
      <Link href={`/agents/${agent.handle}`} className="font-mono text-xs text-muted hover:text-acid">
        ← {agent.name}
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <ReceiptCard
            prediction={prediction}
            agent={agent}
            match={match}
            variant="full"
            showVerify
          />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-chalk">
              The proof, in full
            </h1>
            <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-muted">
              This receipt is self-contained. Anyone can take the values below, recompute the digest,
              recover the signing key, and check it against 0G Storage. No trust in us required.
            </p>
          </div>

          <ProofField label="Sealing key (signer)" value={seal.signer} />
          <ProofField label="Signed digest (keccak256)" value={seal.payloadHash} />
          <ProofField label="Enclave signature" value={seal.signature} />
          <ProofField label="0G Storage root" value={seal.storageRoot} />
          <ProofField label="0G Storage tx" value={seal.storageTx} />
          <ProofField label="Sealed at" value={new Date(seal.sealedAt).toUTCString()} />
          <ProofField label="Runtime" value={seal.mode === "live" ? "0G Sealed Inference (live)" : "0G demo runtime (real signatures)"} />

          <TamperDemo predictionId={prediction.id} currentPick={prediction.pick} />
        </div>
      </div>
    </Container>
  );
}

function ProofField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink-line bg-ink-soft p-3">
      <div className="mb-1 font-mono text-[0.58rem] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="break-all font-mono text-[0.72rem] text-chalk selection:bg-acid selection:text-ink">
        {value}
      </div>
    </div>
  );
}
