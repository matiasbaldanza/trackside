/**
 * Delete the fixture programme and write it again from scratch.
 *
 *     pnpm content:reset                  # dry run: reports, changes nothing
 *     pnpm content:reset -- --no-dry-run  # actually does it
 *
 * **Dry run by default**, deliberately mirroring `sanity migrations run`.
 * This script deletes content, and a destructive command whose default is to
 * destroy is a command that will eventually be run by accident. The same
 * convention twice is also one fewer thing to remember.
 *
 * Only the four document types the fixture programme owns are touched.
 * Anything else in the dataset is left alone, which is why this is preferable
 * to deleting and recreating the dataset.
 *
 * Take an export first — `pnpm content:export`. The runbook requires it, and
 * it is the only rollback there is.
 */
import { getCliClient } from "sanity/cli";

import {
  deleteDocuments,
  describeFixtures,
  FIXTURE_TYPES,
  findProgrammeIds,
  writeProgramme,
} from "./lib/programme";

const client = getCliClient();
const dryRun = !process.argv.includes("--no-dry-run");

async function reset() {
  const { projectId, dataset } = client.config();
  const existing = await findProgrammeIds(client);
  const drafts = existing.filter((id) => id.startsWith("drafts."));

  console.log(`\n${projectId}/${dataset}`);
  console.log(`  would delete : ${existing.length} documents (${drafts.length} drafts)`);
  console.log(`  would write  : ${describeFixtures()}`);
  console.log(`  types touched: ${FIXTURE_TYPES.join(", ")}\n`);

  if (dryRun) {
    console.log("Dry run. Nothing was changed.");
    console.log("Take an export first, then re-run with --no-dry-run:\n");
    console.log("  pnpm content:export");
    console.log("  pnpm content:reset -- --no-dry-run\n");
    return;
  }

  const deleted = await deleteDocuments(client, existing);
  console.log(`Deleted ${deleted} documents.`);

  const written = await writeProgramme(client);
  console.log(`Wrote ${written} documents.`);

  console.log("\nVerify against the public API, not the Studio:");
  console.log(
    `  curl -s --get "https://${projectId}.api.sanity.io/v2026-07-31/data/query/${dataset}" \\\n` +
      `    --data-urlencode 'query=count(*[_type==\"session\"])'\n`,
  );
}

reset().catch((error) => {
  console.error("\nReset failed.\n");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
