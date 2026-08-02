import { createClient } from "next-sanity";

import { sanityConfig } from "@/lib/env";

/**
 * The Sanity client. One instance, imported by nothing outside this
 * directory.
 *
 * `useCdn` is false, and that is not a performance oversight.
 *
 * Sanity's CDN and Next's Data Cache are both caches, and stacking them means
 * an invalidation reaches only the outer one. When a webhook invalidates a
 * cache tag, Next re-runs the query -- and a CDN-backed client would answer it
 * from an edge copy that is still stale, so the page updates to the same wrong
 * content and nothing in the logs says so. Next owns caching here; the client
 * always asks the API. See `fetch.ts` for the policy that follows from this.
 *
 * `perspective: "published"` makes the default explicit rather than inherited.
 * Drafts are opt-in, per request, and require a token.
 */
export const client = createClient({
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
  apiVersion: sanityConfig.apiVersion,
  useCdn: false,
  perspective: "published",
  stega: false,
});
