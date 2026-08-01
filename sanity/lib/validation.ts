import type { ValidationContext } from "sanity";

import { sanityConfig } from "@/lib/env";

import {
  findTrackConflicts,
  isSchedulable,
  isWithinEvent,
  type EventDates,
  type IdentifiedSession,
  type Scheduled,
} from "./scheduling";

/**
 * The parts of validation that need to ask the dataset a question.
 *
 * The rules themselves live in `scheduling.ts` as pure functions. This module
 * only fetches what those rules need and turns their answers into messages.
 * Keeping the two apart is what allows the rules to be tested exhaustively
 * while this thin layer is exercised by using the Studio.
 */

/** Drafts share an id with their published document, prefixed. */
export function publishedId(id: string): string {
  return id.replace(/^drafts\./, "");
}

/** Both ids a document may be stored under. */
function bothIds(id: string): [string, string] {
  const published = publishedId(id);
  return [published, `drafts.${published}`];
}

function client(context: ValidationContext) {
  return context.getClient({ apiVersion: sanityConfig.apiVersion });
}

export interface SessionDocument extends Partial<Scheduled> {
  _id?: string;
  _type?: string;
  title?: string;
  type?: string;
  track?: { _ref?: string };
  speakers?: Array<{ _ref?: string }>;
  capacity?: number;
  signupUrl?: string;
}

/**
 * Sessions sharing this room whose times collide with this one.
 *
 * Candidates are narrowed by room in the query and compared in memory,
 * because the end of a session is derived rather than stored and so cannot be
 * expressed as a GROQ filter. For a programme of tens of sessions per room
 * that is the right trade; at thousands it would not be, and the fix would be
 * to store a denormalised end alongside the duration rather than to move the
 * comparison into the query.
 */
export async function findConflictsInRoom(
  doc: SessionDocument,
  context: ValidationContext,
): Promise<IdentifiedSession[]> {
  if (!doc._id || !doc.track?._ref || !isSchedulable(doc)) return [];

  const siblings = await client(context).fetch<IdentifiedSession[]>(
    `*[_type == "session" && track._ref == $trackId && !(_id in $ids) && defined(startsAt)]{
      _id, title, startsAt, durationMinutes
    }`,
    { trackId: doc.track._ref, ids: bothIds(doc._id) },
  );

  // A published document and its own draft are the same session. Excluding
  // both ids above handles the document being edited; deduplicating here
  // handles every other session that also has a draft in flight.
  const byPublishedId = new Map<string, IdentifiedSession>();
  for (const sibling of siblings) {
    const key = publishedId(sibling._id ?? "");
    if (!byPublishedId.has(key) || sibling._id?.startsWith("drafts.")) {
      byPublishedId.set(key, sibling);
    }
  }

  return findTrackConflicts(doc, [...byPublishedId.values()]);
}

/**
 * Sessions that collide with this one and share a speaker with it.
 *
 * Reported as a warning rather than an error — see ADR-0003. A programme
 * under construction contains this state constantly, and blocking on it would
 * stop editors saving work in progress.
 */
export async function findSpeakerClashes(
  doc: SessionDocument,
  context: ValidationContext,
): Promise<Array<IdentifiedSession & { speakerName?: string }>> {
  const speakerIds = (doc.speakers ?? []).map((s) => s?._ref).filter(Boolean) as string[];
  if (!doc._id || speakerIds.length === 0 || !isSchedulable(doc)) return [];

  const candidates = await client(context).fetch<Array<IdentifiedSession & { speakerName?: string }>>(
    `*[_type == "session" && !(_id in $ids) && defined(startsAt)
       && count((speakers[]._ref)[@ in $speakerIds]) > 0]{
      _id, title, startsAt, durationMinutes,
      "speakerName": speakers[@._ref in $speakerIds][0]->name
    }`,
    { ids: bothIds(doc._id), speakerIds },
  );

  return findTrackConflicts(doc, candidates);
}

/** The event singleton, or null when it has not been created yet. */
export async function fetchEventDates(context: ValidationContext): Promise<EventDates | null> {
  return client(context).fetch<EventDates | null>(
    `*[_type == "event"][0]{ startDate, endDate, timezone }`,
  );
}

/**
 * Is this session inside the conference?
 *
 * Returns `true` when the event has no dates yet. An incomplete event is the
 * event document's problem, and reporting it against every session would bury
 * the real message under thirty copies of an unrelated one.
 */
export async function isInsideEvent(
  doc: SessionDocument,
  context: ValidationContext,
): Promise<boolean> {
  if (!isSchedulable(doc)) return true;
  const event = await fetchEventDates(context);
  if (!event?.startDate || !event?.endDate || !event?.timezone) return true;
  return isWithinEvent(doc, event);
}

/** `“A”, “B” and “C”` — for naming conflicting sessions in a message. */
export function listTitles(sessions: Array<{ title?: string }>): string {
  const titles = sessions.map((s) => `“${s.title || "an untitled session"}”`);
  if (titles.length <= 1) return titles[0] ?? "";
  return `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
}
