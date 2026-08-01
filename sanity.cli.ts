import { defineCliConfig } from "sanity/cli";

/**
 * Configuration for the Sanity CLI -- schema extraction, type generation,
 * dataset export and import, and content migrations.
 *
 * This is the one file permitted to read process.env directly -- the single
 * documented exception to the invariant in AGENTS.md. Two reasons, neither
 * cosmetic:
 *
 *  1. The Sanity CLI loads this file in plain Node, without Next.js module
 *     resolution or the `@/` path alias that src/lib/env.ts is imported by.
 *  2. src/lib/env.ts throws on read for any missing variable. That is correct
 *     for a running application, and wrong here: `sanity migration run` and
 *     `sanity typegen generate` would fail on an unrelated absent token.
 *
 * The failure mode differs accordingly. A missing value here breaks a
 * developer's command with a CLI error, not a visitor's request.
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
