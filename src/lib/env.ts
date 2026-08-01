/**
 * Environment configuration, read and validated in one place.
 *
 * Nothing else in the application reads `process.env`. A missing variable
 * should fail loudly at startup with a message naming the variable, rather
 * than surfacing later as an unexplained request failure.
 *
 * Next.js inlines `NEXT_PUBLIC_`-prefixed values into the client bundle, so
 * the prefix -- not convention -- is what decides whether a value reaches the
 * browser. Tokens must never carry it. They are read lazily by the helpers
 * below so that importing this module from a Client Component cannot pull a
 * secret into the bundle.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and see docs/runbook.md.`,
    );
  }
  return value;
}

/** Public Sanity configuration. Safe in the browser. */
export const sanityConfig = {
  projectId: required(
    "NEXT_PUBLIC_SANITY_PROJECT_ID",
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  ),
  dataset: required("NEXT_PUBLIC_SANITY_DATASET", process.env.NEXT_PUBLIC_SANITY_DATASET),
  /**
   * Pinned API date. Sanity resolves query behaviour against this, so moving
   * it can change results and is a deliberate, reviewed step.
   */
  apiVersion: required(
    "NEXT_PUBLIC_SANITY_API_VERSION",
    process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  ),
} as const;

/**
 * Token for reading unpublished drafts. Server-only.
 *
 * Absent by default: reading published content needs no credentials, so this
 * is required only where preview is actually used, and callers are expected
 * to handle its absence rather than assume it.
 */
export function readToken(): string {
  return required("SANITY_API_READ_TOKEN", process.env.SANITY_API_READ_TOKEN);
}

/**
 * Token for writing content -- seeding, exports and content migrations.
 * Server-only, and never used by the running application.
 */
export function writeToken(): string {
  return required("SANITY_API_WRITE_TOKEN", process.env.SANITY_API_WRITE_TOKEN);
}
