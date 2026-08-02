import type { Room, ScheduledSession } from "@/lib/sanity";

/**
 * Where each session sits on the timetable grid.
 *
 * The desktop timetable is a CSS grid with a proportional time axis: one row
 * per `ROW_MINUTES`, so a ninety-minute workshop is visibly three times a
 * thirty-minute talk. That only works if something turns instants into row
 * numbers, and doing it in the component would put the one piece of arithmetic
 * most likely to be wrong in the one place hardest to test.
 *
 * Everything here works in **minutes since local midnight at the venue**, not
 * in UTC offsets. A grid whose rows are UTC-derived is correct only where the
 * venue's offset is a whole number of hours, and silently draws every row
 * half an hour out of alignment in Kolkata or Adelaide.
 */

/** Grid resolution. Five minutes is the smallest interval a programme uses. */
export const ROW_MINUTES = 5;

/** Sessions before this are unusual; the axis starts here unless one is. */
const DEFAULT_FROM_MINUTE = 8 * 60;
const DEFAULT_TO_MINUTE = 18 * 60;

/**
 * Minutes since local midnight at the venue.
 *
 * `hourCycle: "h23"` is set explicitly because the alternative, `h24`, renders
 * midnight as hour 24 -- which would place the first session of the day 1440
 * minutes below the top of the grid.
 */
export function venueMinutesOfDay(instant: string | Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export interface Placement {
  /** 1-indexed CSS grid row. */
  row: number;
  /** How many rows the session spans. Never less than one. */
  span: number;
  /** 1-indexed CSS grid column, counting the time axis as column 1. */
  column: number;
}

export interface DayLayout {
  /** Local minutes at the top of the grid, always on the hour. */
  fromMinute: number;
  /** Local minutes at the bottom. */
  toMinute: number;
  rowCount: number;
  /**
   * The marks down the time axis.
   *
   * Each carries the instant it sits at as well as the venue hour, because a
   * reader who has asked for their own timezone needs the axis to agree with
   * the cards beside it -- and only an instant can be re-expressed in another
   * zone. `null` when the day has no sessions to anchor against, in which case
   * no axis is drawn anyway.
   */
  hours: { hour: number; row: number; instant: string | null }[];
  placements: Map<string, Placement>;
}

function floorToHour(minute: number): number {
  return Math.floor(minute / 60) * 60;
}

function ceilToHour(minute: number): number {
  return Math.ceil(minute / 60) * 60;
}

/**
 * Place a day's sessions on the grid.
 *
 * The axis is derived from the content rather than fixed: a day that starts
 * with registration at 08:30 and ends at 19:00 gets exactly that range, so no
 * screen height is spent on hours the conference is not running. A day with
 * no sessions still returns a usable grid, because the empty state is drawn
 * inside it.
 *
 * A session that runs past midnight is clamped to the end of the grid rather
 * than wrapping to row one. It is the rarer wrong-looking case, and the
 * alternative draws a party at 02:00 on top of the opening keynote.
 */
export function layOutDay(
  sessions: readonly ScheduledSession[],
  rooms: readonly Room[],
  timeZone: string,
): DayLayout {
  const columnByRoom = new Map(rooms.map((room, index) => [room.id, index + 2]));

  const spans = sessions.map((session) => {
    const start = venueMinutesOfDay(session.startsAt, timeZone);
    return { session, start, end: start + session.durationMinutes };
  });

  const fromMinute = spans.length
    ? floorToHour(Math.min(...spans.map((span) => span.start)))
    : DEFAULT_FROM_MINUTE;
  const toMinute = spans.length
    ? Math.max(ceilToHour(Math.max(...spans.map((span) => span.end))), fromMinute + 60)
    : DEFAULT_TO_MINUTE;

  const clamped = Math.min(toMinute, 24 * 60);
  const rowCount = Math.max(1, Math.round((clamped - fromMinute) / ROW_MINUTES));

  const placements = new Map<string, Placement>();
  for (const { session, start, end } of spans) {
    // A session whose room has no column gets no placement at all. Defaulting
    // to the first column would draw it on top of whatever belongs there,
    // under a header naming a different room -- wrong, and wrong invisibly.
    // `DaySchedule` renders an unplaced card in normal flow, so being absent
    // from the grid is a state the interface already handles.
    const column = columnByRoom.get(session.room.id);
    if (column === undefined) continue;

    const row = Math.round((start - fromMinute) / ROW_MINUTES) + 1;
    const lastRow = Math.min(Math.round((end - fromMinute) / ROW_MINUTES) + 1, rowCount + 1);
    placements.set(session.id, {
      row,
      span: Math.max(1, lastRow - row),
      column,
    });
  }

  // The instant at a given local minute is derived from a session rather than
  // reconstructed from the date and the zone, because the inverse conversion
  // -- local wall time back to an instant -- is the one Intl does not offer.
  // The arithmetic is exact except across a DST transition falling inside the
  // conference day, where labels after the transition would be an hour out.
  // That is a case this programme does not have and the schema does not
  // prevent; it is recorded here rather than hidden.
  const anchor = spans.reduce<(typeof spans)[number] | null>(
    (earliest, span) => (!earliest || span.start < earliest.start ? span : earliest),
    null,
  );
  const anchorTime = anchor ? new Date(anchor.session.startsAt).getTime() : null;

  const hours: { hour: number; row: number; instant: string | null }[] = [];
  for (let minute = fromMinute; minute < clamped; minute += 60) {
    hours.push({
      hour: minute / 60,
      row: (minute - fromMinute) / ROW_MINUTES + 1,
      instant:
        anchor && anchorTime !== null
          ? new Date(anchorTime + (minute - anchor.start) * 60_000).toISOString()
          : null,
    });
  }

  return { fromMinute, toMinute: clamped, rowCount, hours, placements };
}
