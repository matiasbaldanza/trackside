/**
 * Load the Nodo Conf fixture programme into a dataset.
 *
 *     pnpm seed
 *
 * Idempotent. Documents have stable ids derived from their slugs and are
 * written with `createOrReplace`, so running it twice replaces rather than
 * duplicates. That matters more than it sounds: a seed script that can only
 * be run once is a script nobody dares run.
 *
 * This only ever writes. It does not remove documents that are no longer in
 * the fixture set — `pnpm content:reset` does that, separately and with a dry
 * run, because deleting is a different kind of operation and should not be a
 * side effect of seeding.
 *
 * Only published documents are written. Seeding drafts would leave everything
 * unpublished, and the point of the fixture set is a programme the public
 * schedule can actually read.
 */
import { getCliClient } from "sanity/cli";

import { describeFixtures, writeProgramme } from "./lib/programme";

/**
 * The client is requested rather than assumed to be in scope. `sanity exec`
 * does not inject a global; `getCliClient()` returns one configured from
 * sanity.cli.ts and authenticated with the token `--with-user-token` supplies.
 */
const client = getCliClient();

async function seed() {
  const { projectId, dataset } = client.config();

  console.log(`\nSeeding into ${projectId}/${dataset}`);
  console.log(`  ${describeFixtures()}\n`);

  const written = await writeProgramme(client);

  console.log(`Wrote ${written} documents. Open /studio to see the programme.\n`);
}

seed().catch((error) => {
  console.error("\nSeeding failed.\n");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
