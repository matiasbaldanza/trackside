/**
 * Load the Nodo Conf fixture programme into a dataset.
 *
 * Run with the Sanity CLI, which supplies an authenticated client:
 *
 *     pnpm seed
 *
 * Idempotent. Documents have stable ids derived from their slugs and are
 * written with `createOrReplace`, so running it twice replaces rather than
 * duplicates. That matters more than it sounds: a seed script that can only
 * be run once is a script nobody dares run.
 *
 * Only published documents are written. Seeding drafts would leave every
 * document in an unpublished state, and the point of the fixture set is to
 * have a programme the public schedule can actually read.
 */
import { getCliClient } from "sanity/cli";

import { fixtureDocuments, fixtureSummary } from "../fixtures/nodo-conf";

/**
 * The client is requested rather than assumed to be in scope. `sanity exec`
 * does not inject a global; `getCliClient()` returns one configured from
 * sanity.cli.ts and authenticated with the token `--with-user-token` supplies.
 */
const client = getCliClient();

async function seed() {
  const dataset = client.config().dataset;
  const projectId = client.config().projectId;

  console.log(`\nSeeding ${fixtureDocuments.length} documents into ${projectId}/${dataset}`);
  console.log(
    `  ${fixtureSummary.event} event · ${fixtureSummary.rooms} rooms · ` +
      `${fixtureSummary.speakers} speakers · ${fixtureSummary.sessions} sessions\n`,
  );

  // One transaction: either the whole programme lands or none of it does.
  // A partial programme is worse than no programme, because references would
  // dangle and the schedule would render half a conference.
  const transaction = fixtureDocuments.reduce(
    (tx, doc) => tx.createOrReplace(doc),
    client.transaction(),
  );

  await transaction.commit({ visibility: "async" });

  console.log("Done. Open /studio to see the programme.\n");
}

seed().catch((error) => {
  console.error("\nSeeding failed.\n");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
