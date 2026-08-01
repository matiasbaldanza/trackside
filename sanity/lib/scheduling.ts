/**
 * Scheduling arithmetic, as pure functions.
 *
 * Nothing here touches Sanity, the network, or the clock. That is deliberate
 * and it is the reason this module exists separately from the schema: the
 * rules that decide whether a programme is valid are the rules most worth
 * testing, and testing them should not require booting a Studio.
 *
 * The schema imports these. So do the tests. There is no second copy.
 */

/** A session reduced to the fields scheduling arithmetic actually needs. */
export interface Scheduled {
  startsAt: string;
  durationMinutes: number;
}

/**
 * The instant a session ends.
 *
 * End times are derived, never stored: two stored fields can disagree, and
 * the one that disagrees silently is always the one nobody edits. See
 * ADR-0002.
 */
export function endsAt(session: Scheduled): Date {
  return new Date(new Date(session.startsAt).getTime() + session.durationMinutes * 60_000);
}

/**
 * Do two sessions occupy overlapping time?
 *
 * Half-open intervals: a session ending at 10:30 and one starting at 10:30 do
 * not overlap. Back-to-back sessions in one room are the normal case, and
 * treating them as a conflict would make the rule useless.
 */
export function overlaps(a: Scheduled, b: Scheduled): boolean {
  const aStart = new Date(a.startsAt).getTime();
  const bStart = new Date(b.startsAt).getTime();
  return aStart < endsAt(b).getTime() && bStart < endsAt(a).getTime();
}

/** A session with enough identity to be named in an error message. */
export interface IdentifiedSession extends Scheduled {
  _id?: string;
  title?: string;
}

/**
 * Which of `others` collide with `session`.
 *
 * Takes the candidates rather than fetching them, so the rule itself stays
 * pure and the fetching stays where it can be seen. Sessions missing a start
 * or a duration are skipped: they are incomplete rather than conflicting, and
 * reporting them here would blame the wrong document.
 */
export function findTrackConflicts<T extends IdentifiedSession>(
  session: Scheduled,
  others: readonly T[],
): T[] {
  if (!isSchedulable(session)) return [];
  return others.filter((other) => isSchedulable(other) && overlaps(session, other));
}

/**
 * Has this session enough information to occupy a slot at all?
 *
 * Generic so that narrowing preserves whatever else the caller knows about
 * the value. A non-generic guard would widen a full session document down to
 * the two fields this module cares about.
 */
export function isSchedulable<T extends Partial<Scheduled>>(session: T): session is T & Scheduled {
  return (
    typeof session.startsAt === "string" &&
    !Number.isNaN(new Date(session.startsAt).getTime()) &&
    typeof session.durationMinutes === "number" &&
    session.durationMinutes > 0
  );
}

/**
 * The calendar date an instant falls on **in a given timezone**, as
 * `YYYY-MM-DD`.
 *
 * This conversion is the whole reason the event carries a venue timezone. A
 * session at 23:30 in Buenos Aires is already the next day in UTC, so any
 * grouping that compares raw timestamps puts late sessions on the wrong day —
 * quietly, and only sometimes, which is the worst way for it to be wrong.
 *
 * `en-CA` is used because it formats as `YYYY-MM-DD`, which sorts
 * lexicographically. The locale is a formatting mechanism here, not a
 * statement about the audience.
 */
export function venueDate(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

export interface EventDates {
  startDate: string;
  endDate: string;
  timezone: string;
}

/**
 * Every date the conference occupies, inclusive of both ends.
 *
 * Days are derived rather than stored — see ADR-0002 — and this is where that
 * derivation lives. Iterating in UTC is safe because the inputs are plain
 * dates with no time component.
 */
export function conferenceDays(event: EventDates): string[] {
  const days: string[] = [];
  const end = new Date(`${event.endDate}T00:00:00Z`);
  const cursor = new Date(`${event.startDate}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days;

  while (cursor <= end && days.length < 366) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Does a session fall entirely within the conference?
 *
 * The end is checked a millisecond early so that a session finishing exactly
 * at midnight belongs to the day it ran on, not the one it touched.
 */
export function isWithinEvent(session: Scheduled, event: EventDates): boolean {
  const days = conferenceDays(event);
  if (days.length === 0) return true;

  const first = days[0];
  const last = days[days.length - 1];
  const startDay = venueDate(session.startsAt, event.timezone);
  const endDay = venueDate(new Date(endsAt(session).getTime() - 1), event.timezone);

  return startDay >= first && endDay <= last;
}

/** Minutes as `1h 30m`, `45 min`, or `2h`. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** How a live status reads in a compact space. Empty when nothing is wrong. */
export function formatStatusBadge(state?: string, delayMinutes?: number): string {
  switch (state) {
    case "delayed":
      return delayMinutes ? `Delayed +${delayMinutes}m` : "Delayed";
    case "moved":
      return "Moved";
    case "cancelled":
      return "Cancelled";
    default:
      return "";
  }
}

export interface SessionPreviewInput {
  title?: string;
  type?: string;
  startsAt?: string;
  durationMinutes?: number;
  trackName?: string;
  state?: string;
  delayMinutes?: number;
}

/**
 * The subtitle shown against a session in the Studio's document lists.
 *
 * Reads as `Sat 10:30 · Main Hall · 40 min · Delayed +15m`, so that a list of
 * thirty sessions can be scanned as a schedule rather than as a list of
 * titles. During an event this list is the thing an operator is looking at,
 * and a column of identical-looking rows is useless to them.
 *
 * Times render in the viewer's own timezone, not the venue's: the Studio has
 * no access to the event document from a preview, and inventing a second
 * source for the venue timezone to work around that would be worse than the
 * ambiguity. The field description on `startsAt` says so plainly.
 */
export function formatSessionPreview(input: SessionPreviewInput): {
  title: string;
  subtitle?: string;
} {
  const { title, type, startsAt, durationMinutes, trackName, state, delayMinutes } = input;

  const when = startsAt
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(startsAt))
    : "Unscheduled";

  const parts = [
    when,
    trackName,
    durationMinutes ? formatDuration(durationMinutes) : undefined,
    formatStatusBadge(state, delayMinutes) || undefined,
  ].filter(Boolean);

  const isInterval = type === "break" || type === "registration";

  return {
    title: title || (isInterval ? "Untitled interval" : "Untitled session"),
    subtitle: parts.join(" · ") || undefined,
  };
}
