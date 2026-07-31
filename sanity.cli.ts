import { defineCliConfig } from "sanity/cli";

/**
 * Configuration for the Sanity CLI -- schema extraction, type generation,
 * dataset export and import, and content migrations.
 *
 * Separate from sanity.config.ts because the CLI runs in Node without the
 * Next.js module resolution that sanity.config.ts relies on, so it reads
 * process.env directly. This is the one place outside src/lib/env.ts that
 * does, and it is deliberate: a missing value here fails a developer's
 * command, not a user's request.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
  /**
   * The Studio is served by Next.js, so the CLI never builds or deploys it.
   * `sanity deploy` would produce a second, separately hosted Studio -- see
   * ADR-0001.
   */
  studioHost: undefined,
});
