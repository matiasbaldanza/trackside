import type { Day, Room } from "@/lib/sanity";
import { venueDate } from "../../../sanity/lib/scheduling";

/**
 * Which day and which room the visitor is looking at.
 *
 * The filters are links driving `searchParams`, not client state. Three
 * reasons, in order of how much they matter:
 *
 *  1. A filtered view is a URL. "Saturday in the workshop room" can be sent to
 *     someone, bookmarked, and reopened, and the back button does what the
 *     back button does.
 *  2. Filtering happens on the server, so it costs no JavaScript at all. On
 *     venue wifi, the schedule is exactly the page that must not depend on a
 *     bundle arriving.
 *  3. The result is rendered HTML, which means it is correct before hydration
 *     rather than after it.
 *
 * Parsing lives here so that an unknown value in a hand-edited URL resolves to
 * something sensible rather than to an empty page.
 */

export interface Selection {
  /** `YYYY-MM-DD`. Always a day the programme actually has. */
  day: string;
  /** A room slug, or `null` for every room. */
  room: string | null;
}

export interface ScheduleParams {
  day?: string | string[];
  room?: string | string[];
  tz?: string | string[];
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolve the query string against the programme.
 *
 * The default day is the one the conference is on **today**, and the first day
 * otherwise. A visitor at the venue on the second morning should not have to
 * click past the first day to find out what is happening around them, and a
 * visitor in June should see the programme start at the beginning.
 *
 * "Today" is the venue's today, not the reader's. An attendee in the hall and
 * a colleague following from Berlin should be looking at the same page, and
 * the venue's date is the one the conference is actually run on.
 */
export function resolveSelection(
  params: ScheduleParams,
  days: readonly Day[],
  rooms: readonly Room[],
  timeZone: string,
  now: Date = new Date(),
): Selection {
  const requestedDay = first(params.day);
  const today = venueDate(now, timeZone);

  const day =
    days.find((candidate) => candidate.date === requestedDay)?.date ??
    days.find((candidate) => candidate.date === today)?.date ??
    days[0]?.date ??
    today;

  const requestedRoom = first(params.room);
  const room = rooms.find((candidate) => candidate.slug === requestedRoom)?.slug ?? null;

  return { day, room };
}

/** The rooms whose columns should be drawn. */
export function visibleRooms(rooms: readonly Room[], selection: Selection): Room[] {
  if (!selection.room) return [...rooms];
  return rooms.filter((room) => room.slug === selection.room);
}

/**
 * A day narrowed to the selected room.
 *
 * Filters on the room the session is *in*, which for a moved session is its
 * new room. Someone filtering to the workshop room wants what is happening
 * there, and a session that has been moved into it is happening there.
 */
export function filterDay(day: Day, selection: Selection): Day {
  if (!selection.room) return day;
  return {
    date: day.date,
    sessions: day.sessions.filter((session) => session.room.slug === selection.room),
  };
}

/**
 * A schedule URL with some parameters changed and the rest kept.
 *
 * Kept, specifically, so that choosing a different day does not silently
 * discard the room filter or the reader's timezone preference. Values equal to
 * the default are omitted rather than written out, so the plain URL stays
 * plain and two routes to the same view produce the same link.
 */
export function scheduleHref(
  current: ScheduleParams,
  patch: Partial<Record<"day" | "room" | "tz", string | null>>,
): string {
  const merged: Record<string, string | undefined> = {
    day: first(current.day),
    room: first(current.room),
    tz: first(current.tz),
    ...Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [key, value ?? undefined]),
    ),
  };

  const search = new URLSearchParams();
  for (const key of ["day", "room", "tz"] as const) {
    const value = merged[key];
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/?${query}` : "/";
}
