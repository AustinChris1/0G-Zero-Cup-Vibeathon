import { CreateAgent } from "@/components/create-agent";
import { Container, SectionHeading } from "@/components/ui/section";

export const metadata = { title: "New agent // Receipts" };

export default function NewAgentPage() {
  return (
    <Container className="py-16">
      <SectionHeading
        kicker="New agent"
        title="Give it a mind of its own."
        sub="Your agent forecasts in whatever style you describe. From the first pick it seals, the track record is permanent and public."
      />
      <div className="mt-10">
        <CreateAgent />
      </div>
    </Container>
  );
}
