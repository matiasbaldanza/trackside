import type { LiveState, ScheduledSession, SessionType } from "@/lib/sanity";
import { formatDuration, venueDate } from "../../../sanity/lib/scheduling";

/**
 * Two pure helpers the interface needs, re-exported from the module the Studio
 * also uses, so there is still exactly one implementation of each.
 *
 * They pass through here rather than through `@/lib/sanity` on purpose. That
 * boundary is about *content access* -- documents, queries, caching -- and
 * `venueDate` and `formatDuration` are arithmetic that knows nothing about a
 * CMS. Routing them through it would imply they are a Sanity concern and would
 * make the boundary mean two things, which is precisely what ADR-0006 exists
 * to prevent.
 *
 * What this does buy is that the relative traversal out of `src/` lives in two
 * modules at the edge rather than in every route that needs to format a
 * duration.
 */
export { formatDuration, venueDate };

/**
 * How times, dates and statuses read on the page.
 *
 * Separate from `sanity/lib/scheduling.ts`, which the Studio also imports:
 * that module formats for editors inside Sanity, this one formats for
 * attendees. Sharing them would tie two interfaces with different audiences
 * to the same strings.
 *
 * Every function takes the timezone it should format in. There is no ambient
 * default, because the two answers -- the venue's timezone and the reader's --
 * are both correct depending on who is asking, and a default would silently
 * pick one.
 */

/** `14:30`, always 24-hour, always two digits, so a column of times aligns. */
export function formatTime(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/** `Thu 24 Sep`, for a day tab. */
export function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** `Thursday 24 September`, for a heading that is read rather than scanned. */
export function formatDayHeading(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * The offset a timezone is at on a given instant, as `UTC−3`.
 *
 * Computed at an instant rather than stated as a constant because it is not
 * one: Buenos Aires is UTC−3 all year, but a conference in Berlin is UTC+1 in
 * March and UTC+2 in July, and the label has to agree with the times printed
 * next to it.
 */
export function formatOffset(instant: string | Date, timeZone: string): string {
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(instant))
    .find((part) => part.type === "timeZoneName")?.value;

  // Intl gives "GMT-3"; the minus is a hyphen, which renders short and reads
  // as a hyphenation in the middle of a sentence.
  return (label ?? "UTC").replace("GMT", "UTC").replace("-", "−");
}

/**
 * A timezone named and quantified: `UTC+2 · Europe Berlin`.
 *
 * Used for the reader's own zone, where the offset alone is not enough --
 * "UTC+2" is a fact about arithmetic, and the identifier is what lets someone
 * recognise whether the page has guessed their location correctly.
 *
 * Pure, and takes the zone as an argument, so that the client component that
 * discovers the reader's zone contains no formatting logic of its own and this
 * can be tested without a browser.
 */
export function formatZoneLabel(instant: string | Date, timeZone: string): string {
  return `${formatOffset(instant, timeZone)} · ${timeZone.replace(/_/g, " ")}`;
}

const TYPE_LABELS: Record<SessionType, string> = {
  talk: "Talk",
  keynote: "Keynote",
  workshop: "Workshop",
  panel: "Panel",
  break: "Break",
  registration: "Registration",
};

export function formatType(type: SessionType): string {
  return TYPE_LABELS[type] ?? "Talk";
}

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Spanish",
  en: "English",
};

export function formatLanguage(language: string | null): string | null {
  if (!language) return null;
  return LANGUAGE_LABELS[language] ?? language.toUpperCase();
}

const LEVEL_LABELS: Record<string, string> = {
  intro: "Introductory",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function formatLevel(level: string | null): string | null {
  if (!level) return null;
  return LEVEL_LABELS[level] ?? level;
}

/**
 * The status in words.
 *
 * Returns `null` for a session running as planned. "On time" on twenty-six
 * cards is noise that makes the two cards that say something else harder to
 * find, which is the opposite of what a status is for.
 */
export function formatStatus(session: ScheduledSession): string | null {
  const { state, delayMinutes, movedTo } = session.status;
  switch (state) {
    case "delayed":
      return delayMinutes ? `Delayed ${delayMinutes} min` : "Delayed";
    case "moved":
      return movedTo ? `Moved to ${movedTo.name}` : "Moved";
    case "cancelled":
      return "Cancelled";
    default:
      return null;
  }
}

/**
 * What a status change means for someone reading the printed programme.
 *
 * A delay is only intelligible against the time it was supposed to start, and
 * a move against the room it was supposed to be in. Without these, a schedule
 * that quietly renders the new values is indistinguishable from one that was
 * always right.
 *
 * The time case returns an instant rather than a formatted string, because the
 * reader may have asked for their own timezone and only a component knows
 * that. The room case is a name and has no such problem.
 */
export function changedFromInstant(session: ScheduledSession): string | null {
  return session.status.state === "delayed" && session.startsAt !== session.plannedStartsAt
    ? session.plannedStartsAt
    : null;
}

export function changedFromRoom(session: ScheduledSession): string | null {
  return session.status.state === "moved" && session.room.id !== session.plannedRoom.id
    ? session.plannedRoom.name
    : null;
}

/** Whether a state needs to be visually distinguished at all. */
export function isDisrupted(state: LiveState): boolean {
  return state !== "onTime";
}
