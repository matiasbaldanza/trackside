import type {
  ProgrammeQueryResult,
  SessionQueryResult,
  SessionSlugsQueryResult,
} from "../../../sanity.types";
import { CACHE_TAGS, REVALIDATE, sanityFetch } from "./fetch";
import {
  toProgramme,
  toRooms,
  toSessionDetail,
  type Programme,
  type SessionDetail,
} from "./programme";
import { programmeQuery, sessionQuery, sessionSlugsQuery } from "./queries";

/**
 * The application's view of the content. Routes import from here and from
 * nowhere else under `src/lib/sanity/`.
 *
 * Each function returns a view model, never a Sanity document, and each one
 * states its own freshness. The tags are what a webhook will invalidate; the
 * intervals are the floor under a delivery that never arrives. See `fetch.ts`.
 *
 * The generated query types are used here and nowhere else. Handing a
 * `ProgrammeQueryResult` to a mapping function that declares its own input
 * shape is what makes `pnpm schema:check` meaningful: remove a field from the
 * schema, and this line stops compiling.
 */

export type {
  Day,
  EventInfo,
  LiveState,
  Programme,
  Room,
  ScheduledSession,
  SessionDetail,
  SessionStatus,
  SessionType,
  Speaker,
} from "./programme";
export { MissingContentError } from "./programme";

/**
 * The full programme, grouped by day.
 *
 * Carries both cache tags because the response contains both kinds of
 * content: the structure of the schedule and the live status laid over it.
 * Splitting them into two requests would mean two round trips to render one
 * page, and the shorter interval already bounds the staleness of the whole.
 */
export async function getProgramme(): Promise<Programme> {
  const raw = await sanityFetch<ProgrammeQueryResult>({
    query: programmeQuery,
    tags: [CACHE_TAGS.programme, CACHE_TAGS.status],
    revalidate: REVALIDATE.schedule,
  });
  return toProgramme(raw);
}

export interface SessionPage {
  session: SessionDetail;
  rooms: ReturnType<typeof toRooms>;
}

/** One session by slug, or `null` if no published session has that slug. */
export async function getSession(slug: string): Promise<SessionPage | null> {
  const raw = await sanityFetch<SessionQueryResult>({
    query: sessionQuery,
    params: { slug },
    tags: [CACHE_TAGS.programme, CACHE_TAGS.status],
    revalidate: REVALIDATE.schedule,
  });

  const rooms = toRooms(raw.rooms);
  const session = toSessionDetail(raw.session, rooms);
  return session ? { session, rooms } : null;
}

/**
 * Every published session slug, for `generateStaticParams`.
 *
 * Uses the long interval: a slug appearing or disappearing changes which pages
 * exist, which is a programme-structure change, not a live one.
 */
export async function getSessionSlugs(): Promise<string[]> {
  const slugs = await sanityFetch<SessionSlugsQueryResult | null>({
    query: sessionSlugsQuery,
    tags: [CACHE_TAGS.programme],
    revalidate: REVALIDATE.programme,
  });
  return slugs ?? [];
}
