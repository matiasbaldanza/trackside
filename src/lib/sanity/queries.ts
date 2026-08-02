import { defineQuery } from "next-sanity";

/**
 * Every GROQ query in the application.
 *
 * `defineQuery` is a no-op at runtime -- it returns the string it was given.
 * Its purpose is to mark the string for `sanity typegen generate`, which
 * parses the GROQ against the extracted schema and emits a result type named
 * after the exported constant. `programmeQuery` becomes `ProgrammeQueryResult`
 * in `sanity.types.ts`, and a projection that asks for a field the schema no
 * longer has fails `pnpm schema:check` rather than returning `undefined` at
 * runtime.
 *
 * The projections are written out in full rather than composed from shared
 * fragments. Typegen parses these strings statically, so interpolating
 * constants into them trades a guarantee for a small saving in repetition --
 * and the guarantee is the entire reason the queries live here.
 *
 * Drafts are excluded explicitly. On this dataset an unauthenticated read
 * cannot see them anyway (a document id containing a dot is private
 * regardless of dataset visibility), but that is a property of the *caller*,
 * not of the query, and a query used with a read token would otherwise return
 * both a draft and its published twin as two sessions in the same room.
 */

/**
 * The whole programme in one round trip: the event, the rooms, and every
 * schedulable session.
 *
 * Sessions missing a start, a duration, or a room are filtered out here. They
 * cannot be placed on a grid, and the schema already warns their editor --
 * the public schedule is the wrong surface on which to report an unfinished
 * document.
 *
 * `track._ref` is projected rather than dereferenced. Rooms are fetched once
 * as a list and resolved in memory, so a twenty-six session programme costs
 * one room lookup rather than twenty-six.
 */
export const programmeQuery = defineQuery(`{
  "event": *[_type == "event" && !(_id in path("drafts.**"))][0]{
    name,
    tagline,
    startDate,
    endDate,
    timezone,
    venueName,
    city
  },
  "rooms": *[_type == "track" && !(_id in path("drafts.**"))] | order(order asc){
    "id": _id,
    name,
    shortName,
    "slug": slug.current,
    order,
    capacity
  },
  "sessions": *[
    _type == "session"
    && !(_id in path("drafts.**"))
    && defined(startsAt)
    && defined(durationMinutes)
    && defined(track._ref)
  ] | order(startsAt asc){
    "id": _id,
    "slug": slug.current,
    title,
    type,
    language,
    level,
    startsAt,
    durationMinutes,
    recorded,
    captioned,
    "roomId": track._ref,
    "speakers": speakers[]->{
      "id": _id,
      name,
      "slug": slug.current,
      jobTitle,
      organisation
    },
    "status": liveStatus{
      state,
      delayMinutes,
      note,
      "movedToRoomId": movedToTrack._ref
    }
  }
}`);

/**
 * One session, with the context needed to describe it.
 *
 * The event and the room list come along because a session is unreadable
 * without them: the venue timezone decides what time it says, and a session
 * that has been moved names a room this query would otherwise not have.
 * Fetching them here keeps the detail route to a single round trip and lets
 * it share the mapping in `programme.ts` rather than growing a second one.
 */
export const sessionQuery = defineQuery(`{
  "event": *[_type == "event" && !(_id in path("drafts.**"))][0]{
    name,
    tagline,
    startDate,
    endDate,
    timezone,
    venueName,
    city
  },
  "rooms": *[_type == "track" && !(_id in path("drafts.**"))] | order(order asc){
    "id": _id,
    name,
    shortName,
    "slug": slug.current,
    order,
    capacity
  },
  "session": *[
    _type == "session"
    && !(_id in path("drafts.**"))
    && slug.current == $slug
  ][0]{
    "id": _id,
    "slug": slug.current,
    title,
    type,
    abstract,
    language,
    level,
    startsAt,
    durationMinutes,
    recorded,
    captioned,
    capacity,
    signupUrl,
    "roomId": track._ref,
    "speakers": speakers[]->{
      "id": _id,
      name,
      "slug": slug.current,
      jobTitle,
      organisation
    },
    "status": liveStatus{
      state,
      delayMinutes,
      note,
      "movedToRoomId": movedToTrack._ref
    }
  }
}`);

/** Slugs of every published session, for static generation. */
export const sessionSlugsQuery = defineQuery(`
  *[_type == "session" && !(_id in path("drafts.**")) && defined(slug.current)].slug.current
`);
