/**
 * Seal a batch of REAL picks so the app has genuine content. Each pick runs
 * real 0G Compute Sealed Inference + a real 0G Storage write (~30s each), so a
 * full batch takes several minutes. The dev server must be running.
 *
 *   node scripts/seal-batch.cjs [matches=3] [agents=7]
 */
const fs = require("fs");

const BASE = process.env.BASE || "http://localhost:3000";
const COMP = (process.env.COMP || "WC").toUpperCase();
const NMATCHES = Number(process.argv[2] || 3);
const NAGENTS = Number(process.argv[3] || 7);

(async () => {
  process.stdout.write("forcing a sync to load fixtures... ");
  const sync = await fetch(`${BASE}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force: true }),
  }).then((r) => r.json());
  console.log(`${sync.fetched ?? 0} fixtures (${sync.reason || "ok"})`);

  const db = JSON.parse(fs.readFileSync("data/store.json", "utf8"));
  const agents = db.agents.slice(0, NAGENTS);
  const upcoming = db.matches
    .filter((m) => m.status === "UPCOMING" && m.source === "live" && m.competition?.code === COMP)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .slice(0, NMATCHES);

  if (upcoming.length === 0) {
    console.log(`No upcoming ${COMP} fixtures to seal. Try COMP=<code> or sync again.`);
    return;
  }
  console.log(
    `Sealing ${agents.length} agents x ${upcoming.length} ${COMP} matches = up to ${agents.length * upcoming.length} real picks (~30s each)\n`,
  );

  let ok = 0, skip = 0, fail = 0;
  for (const m of upcoming) {
    console.log(`-- ${m.home.code} v ${m.away.code} (${m.stage})`);
    for (const a of agents) {
      try {
        const r = await fetch(`${BASE}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: a.id, matchId: m.id }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 201) {
          ok++;
          console.log(`   OK   ${a.name} -> ${j.prediction?.pick} ${Math.round((j.prediction?.confidence || 0) * 100)}%`);
        } else if (r.status === 409) {
          skip++;
          console.log(`   skip ${a.name} (already sealed)`);
        } else {
          fail++;
          console.log(`   FAIL ${a.name}: ${j.error || r.status}`);
        }
      } catch (e) {
        fail++;
        console.log(`   FAIL ${a.name}: ${e.message}`);
      }
    }
  }
  console.log(`\nDone: ${ok} sealed, ${skip} skipped, ${fail} failed.`);
})().catch((e) => console.log("FATAL:", e.message));
