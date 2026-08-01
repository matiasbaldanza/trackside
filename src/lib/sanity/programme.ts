import {
  conferenceDays,
  endsAt,
  isSchedulable,
  venueDate,
  type EventDates,
} from "../../../sanity/lib/scheduling";

/**
 * Sanity documents in, view models out.
 *
 * This module is the content-source boundary named in ADR-0006. Routes and
 * components below it never see a `_ref`, a `slug.current`, or a nullable
 * field that the schema says is required -- they see a `Programme`. Replacing
 * the content source means rewriting this directory and nothing else.
 *
 * It is also where the `liveStatus` contract is enforced. That object's fields
 * are hidden by state rather than cleared by it: a session set to "delayed"
 * with twenty minutes and then back to "on time" still carries
 * `delayMinutes: 20`. Reading it without checking `state` first would show a
 * delay on a session that is running on time. The schema documents the
 * contract; enforcing it at every call site would mean trusting every call
 * site, so it is enforced exactly once, here.
 *
 * Nothing in this file performs I/O, which is what makes all of it testable.
 */

export type LiveState = "onTime" | "delayed" | "moved" | "cancelled";

export type SessionType = "talk" | "keynote" | "workshop" | "panel" | "break" | "registration";

export interface Room {
  id: string;
  name: string;
  /** Falls back to the full name when unset, so callers never branch on it. */
  shortName: string;
  slug: string;
  order: number;
  capacity: number | null;
}

export interface Speaker {
  id: string;
  name: string;
  slug: string | null;
  jobTitle: string | null;
  organisation: string | null;
}

export interface SessionStatus {
  state: LiveState;
  /** Non-null only when `state` is `delayed`. */
  delayMinutes: number | null;
  /** Non-null only when `state` is `moved`. */
  movedTo: Room | null;
  note: string | null;
}

export interface ScheduledSession {
  id: string;
  slug: string;
  title: string;
  type: SessionType;
  language: string | null;
  level: string | null;
  recorded: boolean;
  captioned: boolean;

  /**
   * Where and when the session is actually expected, with any live status
   * already applied. This is what the schedule renders.
   */
  room: Room;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;

  /**
   * Where and when it was planned for. Equal to the effective values unless
   * the session has been delayed or moved.
   *
   * Both are kept because attendees need both: "14:10, moved from 13:50" is
   * useful, and "14:10" alone silently rewrites the printed programme in a
   * reader's hand. A component can compare them without knowing the status
   * rules.
   */
  plannedRoom: Room;
  plannedStartsAt: string;

  status: SessionStatus;
  speakers: Speaker[];
}

export interface SessionDetail extends ScheduledSession {
  abstract: string | null;
  capacity: number | null;
  signupUrl: string | null;
}

export interface Day {
  /** `YYYY-MM-DD` in the venue's timezone. */
  date: string;
  sessions: ScheduledSession[];
}

export interface EventInfo {
  name: string;
  tagline: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string | null;
  city: string | null;
}

export interface Programme {
  event: EventInfo;
  rooms: Room[];
  days: Day[];
}

/* -------------------------------------------------------------------------
 * Query shapes
 *
 * Deliberately wider than the types `sanity typegen` generates, and the
 * difference is the point.
 *
 * Typegen reads the schema and concludes that `type` is one of six strings
 * and `state` one of four. That is what the Studio will *write*, but the
 * Content Lake is schemaless -- the schema is a Studio-side definition, not
 * DDL, and it does not touch documents that already exist. A session created
 * while "lightning" was an option still says `type: "lightning"` after the
 * option is removed, and typegen will tell you that value is impossible.
 *
 * So the input types here are `string`, the mapping functions guard at
 * runtime, and the generated types are still enforced: `index.ts` fetches as
 * `ProgrammeQueryResult` and passes it straight into `toProgramme`, so a
 * projection that stops matching the schema fails to compile. The generated
 * types check the query; these types describe what may actually arrive.
 * ---------------------------------------------------------------------- */

export interface RawRoom {
  id: string | null;
  name: string | null;
  shortName?: string | null;
  slug?: string | null;
  order: number | null;
  capacity?: number | null;
}

export interface RawSpeaker {
  id: string | null;
  name: string | null;
  slug?: string | null;
  jobTitle?: string | null;
  organisation?: string | null;
}

export interface RawStatus {
  state?: string | null;
  delayMinutes?: number | null;
  note?: string | null;
  movedToRoomId?: string | null;
}

export interface RawSession {
  id: string | null;
  slug?: string | null;
  title?: string | null;
  type?: string | null;
  language?: string | null;
  level?: string | null;
  startsAt?: string | null;
  durationMinutes?: number | null;
  recorded?: boolean | null;
  captioned?: boolean | null;
  roomId?: string | null;
  speakers?: RawSpeaker[] | null;
  status?: RawStatus | null;
}

export interface RawSessionDetail extends RawSession {
  abstract?: string | null;
  capacity?: number | null;
  signupUrl?: string | null;
}

export interface RawEvent {
  name?: string | null;
  tagline?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  timezone?: string | null;
  venueName?: string | null;
  city?: string | null;
}

export interface RawProgramme {
  event: RawEvent | null;
  rooms: RawRoom[] | null;
  sessions: RawSession[] | null;
}

/* ---------------------------------------------------------------------- */

const LIVE_STATES: readonly LiveState[] = ["onTime", "delayed", "moved", "cancelled"];

const SESSION_TYPES: readonly SessionType[] = [
  "talk",
  "keynote",
  "workshop",
  "panel",
  "break",
  "registration",
];

/**
 * Thrown when the content is missing something the schedule cannot be built
 * without -- in practice, an unseeded dataset.
 *
 * Distinguished from an empty programme, which is a legitimate state with its
 * own rendering ("the programme has not been announced yet"). A dataset with
 * no event document at all is a deployment problem, and showing an attendee a
 * friendly empty page would hide it from the only people who can fix it.
 */
export class MissingContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingContentError";
  }
}

function toRoom(raw: RawRoom): Room | null {
  if (!raw.id || !raw.name || !raw.slug) return null;
  return {
    id: raw.id,
    name: raw.name,
    shortName: raw.shortName?.trim() || raw.name,
    slug: raw.slug,
    order: raw.order ?? 0,
    capacity: raw.capacity ?? null,
  };
}

export function toRooms(raw: readonly RawRoom[] | null | undefined): Room[] {
  return (raw ?? [])
    .map(toRoom)
    .filter((room): room is Room => room !== null)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function toSpeakers(raw: readonly RawSpeaker[] | null | undefined): Speaker[] {
  return (raw ?? [])
    .filter((speaker): speaker is RawSpeaker & { id: string; name: string } =>
      Boolean(speaker?.id && speaker?.name),
    )
    .map((speaker) => ({
      id: speaker.id,
      name: speaker.name,
      slug: speaker.slug ?? null,
      jobTitle: speaker.jobTitle ?? null,
      organisation: speaker.organisation ?? null,
    }));
}

/**
 * Normalise a live status against its own contract.
 *
 * An unrecognised state is treated as "on time" rather than passed through.
 * The alternative -- rendering a state the interface has no design for -- puts
 * an unstyled word in front of an attendee, and a status nobody can interpret
 * is worse than no status at all.
 */
export function toStatus(
  raw: RawStatus | null | undefined,
  roomsById: ReadonlyMap<string, Room>,
): SessionStatus {
  const declared = raw?.state;
  const state: LiveState = LIVE_STATES.includes(declared as LiveState)
    ? (declared as LiveState)
    : "onTime";

  const delayMinutes =
    state === "delayed" && typeof raw?.delayMinutes === "number" && raw.delayMinutes > 0
      ? raw.delayMinutes
      : null;

  const movedTo =
    state === "moved" && raw?.movedToRoomId ? (roomsById.get(raw.movedToRoomId) ?? null) : null;

  return {
    state,
    delayMinutes,
    movedTo,
    note: raw?.note?.trim() || null,
  };
}

/**
 * A raw session and its resolved room become a `ScheduledSession`, or nothing.
 *
 * Returning `null` for an unplaceable session is deliberate and is why the
 * query filters for the same fields: a session with no room cannot be drawn
 * on a schedule organised by room, and the schema already tells its editor so.
 * The schedule's job is to be correct about what is scheduled, not to report
 * on drafts.
 */
export function toSession(
  raw: RawSession,
  roomsById: ReadonlyMap<string, Room>,
): ScheduledSession | null {
  if (!raw.id || !raw.slug || !raw.title || !raw.roomId) return null;

  const timing = {
    startsAt: raw.startsAt ?? undefined,
    durationMinutes: raw.durationMinutes ?? undefined,
  };
  if (!isSchedulable(timing)) return null;

  const plannedRoom = roomsById.get(raw.roomId);
  if (!plannedRoom) return null;

  const plannedStartsAt = new Date(timing.startsAt).toISOString();
  const durationMinutes = timing.durationMinutes;
  const status = toStatus(raw.status, roomsById);

  // The delay is applied here so that no component has to know the rule. A
  // cancelled session keeps its planned time: it is shown struck through in
  // the slot it would have occupied, because an attendee looking for it needs
  // to find it where the printed programme put it.
  const startsAt =
    status.state === "delayed" && status.delayMinutes
      ? new Date(new Date(plannedStartsAt).getTime() + status.delayMinutes * 60_000).toISOString()
      : plannedStartsAt;

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    type: SESSION_TYPES.includes(raw.type as SessionType) ? (raw.type as SessionType) : "talk",
    language: raw.language ?? null,
    level: raw.level ?? null,
    recorded: raw.recorded === true,
    captioned: raw.captioned === true,

    room: status.movedTo ?? plannedRoom,
    startsAt,
    endsAt: endsAt({ startsAt, durationMinutes }).toISOString(),
    durationMinutes,

    plannedRoom,
    plannedStartsAt,

    status,
    speakers: toSpeakers(raw.speakers),
  };
}

export function toEvent(raw: RawEvent | null | undefined): EventInfo {
  if (!raw?.name || !raw.startDate || !raw.endDate || !raw.timezone) {
    throw new MissingContentError(
      "The event document is missing or incomplete. The schedule needs a name, a date range and a venue timezone; see docs/runbook.md on seeding.",
    );
  }
  return {
    name: raw.name,
    tagline: raw.tagline ?? null,
    startDate: raw.startDate,
    endDate: raw.endDate,
    timezone: raw.timezone,
    venueName: raw.venueName ?? null,
    city: raw.city ?? null,
  };
}

/**
 * Group sessions into the days of the conference, in the venue's timezone.
 *
 * Two things this does not do, both on purpose.
 *
 * It does not drop a session that falls outside the event's date range. That
 * combination is a validation error the schema already raises, and silently
 * hiding the session would leave a talk that exists, is published, and appears
 * nowhere -- the failure this project has already been bitten by once. Its day
 * is added to the list instead, so the mistake is visible to everyone.
 *
 * It does not omit days with no sessions. An empty conference day is a fact
 * about the programme and renders as one; omitting it would make a
 * half-planned schedule look complete.
 */
export function toDays(sessions: readonly ScheduledSession[], event: EventDates): Day[] {
  const byDate = new Map<string, ScheduledSession[]>();
  for (const date of conferenceDays(event)) byDate.set(date, []);

  for (const session of sessions) {
    const date = venueDate(session.startsAt, event.timezone);
    const day = byDate.get(date);
    if (day) day.push(session);
    else byDate.set(date, [session]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => ({
      date,
      sessions: daySessions.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
          a.room.order - b.room.order,
      ),
    }));
}

/** The whole transform, from one query result to the model the routes use. */
export function toProgramme(raw: RawProgramme): Programme {
  const event = toEvent(raw.event);
  const rooms = toRooms(raw.rooms);
  const roomsById = new Map(rooms.map((room) => [room.id, room]));

  const sessions = (raw.sessions ?? [])
    .map((session) => toSession(session, roomsById))
    .filter((session): session is ScheduledSession => session !== null);

  return { event, rooms, days: toDays(sessions, event) };
}

/** The detail route's transform. Returns `null` when the slug matches nothing. */
export function toSessionDetail(
  raw: RawSessionDetail | null | undefined,
  rooms: readonly Room[],
): SessionDetail | null {
  if (!raw) return null;
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const session = toSession(raw, roomsById);
  if (!session) return null;

  return {
    ...session,
    abstract: raw.abstract?.trim() || null,
    capacity: raw.capacity ?? null,
    signupUrl: raw.signupUrl ?? null,
  };
}
