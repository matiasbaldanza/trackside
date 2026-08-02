import type { QueryParams } from "next-sanity";

import { client } from "./client";

/**
 * The only place the application talks to Sanity.
 *
 * Everything above this line consumes view models; everything below it is
 * GROQ and HTTP. Caching policy is expressed here once rather than at each
 * call site, because a policy repeated at call sites is a policy that will
 * eventually disagree with itself.
 */

/**
 * Cache tags, named after what changes rather than after what is displayed.
 *
 * The argument for tags in one sentence: a speaker's biography and a session's
 * live status appear on the same page with completely different lifetimes. A
 * single revalidation interval has to be wrong for one of them -- either
 * biographies are re-fetched every thirty seconds for no reason, or a room
 * change waits behind a timer that knows nothing about it.
 *
 * `programme` covers the structure of the schedule: which sessions exist,
 * when they were planned for, who is speaking, what the rooms are. It changes
 * over weeks. `status` covers only what an operator changes during the event.
 * A webhook maps document mutations onto these tags (Milestone 5); until it
 * exists, the intervals below are what keeps content fresh, and they are set
 * so that the system is stale rather than wrong if a delivery is ever missed.
 */
export const CACHE_TAGS = {
  /** The programme's structure and editorial content. */
  programme: "programme",
  /** Live status only -- the volatile half. */
  status: "status",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * How long a response may be served before it is re-fetched regardless of
 * invalidation.
 *
 * These are a floor under correctness, not the primary freshness mechanism.
 * Tag invalidation is what makes a change appear in seconds; these bound how
 * long a *missed* invalidation can go unnoticed. An hour is tolerable for a
 * programme that changes over weeks. A minute is the ceiling on how stale the
 * schedule can be during an event if the webhook never arrives -- long enough
 * that it costs nothing when delivery works, short enough that an attendee
 * standing outside a room is not misled indefinitely.
 */
export const REVALIDATE = {
  programme: 3600,
  schedule: 60,
} as const;

export interface FetchOptions<Params extends QueryParams = QueryParams> {
  query: string;
  params?: Params;
  /** Tags this response should be invalidated by. */
  tags: readonly CacheTag[];
  /** Seconds. See `REVALIDATE`. */
  revalidate: number;
}

export async function sanityFetch<Result>({
  query,
  params,
  tags,
  revalidate,
}: FetchOptions): Promise<Result> {
  return client.fetch<Result>(query, params ?? {}, {
    next: { tags: [...tags], revalidate },
  });
}
