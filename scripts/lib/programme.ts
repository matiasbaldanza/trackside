import type { SanityClient } from "@sanity/client";

import { fixtureDocuments, fixtureSummary } from "../../fixtures/nodo-conf";

/**
 * Operations on the fixture programme, shared by the seed and reset scripts.
 *
 * Both need to write the same documents, and a second copy of that logic
 * would eventually disagree with the first.
 */

/** The document types the fixture programme owns. */
export const FIXTURE_TYPES = ["event", "track", "speaker", "session"] as const;

export function describeFixtures(): string {
  return (
    `${fixtureSummary.event} event · ${fixtureSummary.rooms} rooms · ` +
    `${fixtureSummary.speakers} speakers · ${fixtureSummary.sessions} sessions`
  );
}

/**
 * Write the whole programme in one transaction.
 *
 * `createOrReplace` with stable ids makes this idempotent — a seed script
 * that can only be run once is a script nobody dares run. One transaction,
 * because a partially seeded conference is worse than an empty one:
 * references dangle and the schedule renders half an event.
 */
export async function writeProgramme(client: SanityClient): Promise<number> {
  const transaction = fixtureDocuments.reduce(
    (tx, doc) => tx.createOrReplace(doc),
    client.transaction(),
  );
  await transaction.commit({ visibility: "async" });
  return fixtureDocuments.length;
}

/**
 * Every document id the fixture programme owns, drafts included.
 *
 * Drafts matter: deleting only published documents leaves `drafts.*`
 * counterparts behind, which reappear in the Studio as unpublished edits to
 * documents that no longer exist.
 */
export async function findProgrammeIds(client: SanityClient): Promise<string[]> {
  return client.fetch<string[]>(`*[_type in $types]._id`, { types: [...FIXTURE_TYPES] });
}

/** Delete in batches, so one oversized request cannot fail the whole reset. */
export async function deleteDocuments(
  client: SanityClient,
  ids: readonly string[],
  batchSize = 25,
): Promise<number> {
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const transaction = batch.reduce((tx, id) => tx.delete(id), client.transaction());
    await transaction.commit({ visibility: "async" });
  }
  return ids.length;
}
