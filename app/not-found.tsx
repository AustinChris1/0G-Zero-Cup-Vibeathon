import Link from "next/link";
import { Container } from "@/components/ui/section";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="font-display text-7xl font-bold tracking-tightest text-acid">404</div>
      <p className="mt-4 font-mono text-sm text-muted">
        No receipt at this address. It was never sealed, or never existed.
      </p>
      <Link href="/" className="btn-acid mt-8 rounded px-6 py-3 text-sm">
        Back to the floor
      </Link>
    </Container>
  );
}
