import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders a team's flag. Live teams from the data providers carry a crest image
 * (covers every nation, even ones with no emoji like Czechia or Curaçao); the
 * curated seed uses emoji. Size scales with the surrounding font size (1em).
 */
export function Flag({ team, className }: { team: Team; className?: string }) {
  if (team.crest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crest}
        alt={team.code}
        loading="lazy"
        className={cn("inline-block h-[1em] w-auto max-w-[1.6em] object-contain align-[-0.12em]", className)}
      />
    );
  }
  return (
    <span className={cn("inline-block align-[-0.05em]", className)} aria-hidden>
      {team.flag || "🏳️"}
    </span>
  );
}
