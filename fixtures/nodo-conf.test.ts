import { describe, expect, it } from "vitest";

import {
  findTrackConflicts,
  isWithinEvent,
  venueDate,
  type Scheduled,
} from "../sanity/lib/scheduling";
import { fixtureDocuments, fixtureSummary, VENUE_TIMEZONE } from "./nodo-conf";

/**
 * The fixture programme is checked against the same rules the Studio enforces.
 *
 * It was written by hand, which means the schedule can be wrong in exactly the
 * ways the validation exists to catch. Seeding a dataset with content that its
 * own schema rejects would be a poor advertisement for the schema, and the
 * failure would surface as a Studio full of red rather than as a failing test.
 */

type Doc = (typeof fixtureDocuments)[number];

const byType = (type: string) => fixtureDocuments.filter((d) => d._type === type);
const event = byType("event")[0] as Doc & { startDate: string; endDate: string; timezone: string };
const rooms = byType("track");
const speakers = byType("speaker");
const sessions = byType("session") as Array<
  Doc & {
    title: string;
    type: string;
    track: { _ref: string };
    startsAt: string;
    durationMinutes: number;
    speakers?: Array<{ _ref: string; _key: string }>;
    capacity?: number;
    signupUrl?: string;
    slug: { current: string };
  }
>;

const eventDates = {
  startDate: event.startDate,
  endDate: event.endDate,
  timezone: event.timezone,
};

describe("fixture shape", () => {
  it("matches its own summary", () => {
    expect({
      event: byType("event").length,
      rooms: rooms.length,
      speakers: speakers.length,
      sessions: sessions.length,
    }).toEqual(fixtureSummary);
  });

  it("has exactly one event", () => {
    expect(byType("event")).toHaveLength(1);
  });

  it("gives every document a unique id", () => {
    const ids = fixtureDocuments.map((d) => d._id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The Content Lake treats any document whose `_id` contains a dot as
   * private, regardless of dataset visibility — that is the mechanism keeping
   * `drafts.*` unreadable on a public dataset.
   *
   * An earlier version of these fixtures used ids like `session.keynote`.
   * Seeding reported success, every document was written, and every one of
   * them was invisible to unauthenticated reads. Nothing failed; the content
   * simply was not there. This test exists because that failure is silent.
   */
  it("uses no dots in document ids, which would make them private", () => {
    const dotted = fixtureDocuments.map((d) => d._id).filter((id) => id.includes("."));
    expect(dotted).toEqual([]);
  });

  it("gives every session a unique slug", () => {
    const slugs = sessions.map((s) => s.slug.current);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("referential integrity", () => {
  const ids = new Set(fixtureDocuments.map((d) => d._id));

  it("points every session at a room that exists", () => {
    for (const s of sessions) {
      expect(ids.has(s.track._ref), `${s.title} → ${s.track._ref}`).toBe(true);
    }
  });

  it("points every speaker reference at a speaker that exists", () => {
    for (const s of sessions) {
      for (const speaker of s.speakers ?? []) {
        expect(ids.has(speaker._ref), `${s.title} → ${speaker._ref}`).toBe(true);
      }
    }
  });

  it("gives every speaker reference a unique key within its session", () => {
    for (const s of sessions) {
      const keys = (s.speakers ?? []).map((r) => r._key);
      expect(new Set(keys).size, s.title).toBe(keys.length);
    }
  });

  it("uses every speaker at least once", () => {
    const used = new Set(sessions.flatMap((s) => (s.speakers ?? []).map((r) => r._ref)));
    const unused = speakers.filter((sp) => !used.has(sp._id)).map((sp) => sp._id);
    expect(unused).toEqual([]);
  });
});

describe("the programme satisfies its own validation", () => {
  // The rule this whole system is built around.
  it("never books a room twice at the same time", () => {
    const conflicts: string[] = [];

    for (const room of rooms) {
      const inRoom = sessions.filter((s) => s.track._ref === room._id);
      for (const candidate of inRoom) {
        const others = inRoom.filter((o) => o._id !== candidate._id);
        for (const clash of findTrackConflicts(candidate as Scheduled, others)) {
          const pair = [candidate.title, clash.title].sort().join(" ↔ ");
          if (!conflicts.includes(pair)) conflicts.push(`${room.name as string}: ${pair}`);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });

  it("keeps every session inside the conference dates", () => {
    const outside = sessions
      .filter((s) => !isWithinEvent(s as Scheduled, eventDates))
      .map((s) => `${s.title} (${s.startsAt})`);
    expect(outside).toEqual([]);
  });

  it("gives every workshop a capacity and a sign-up URL", () => {
    for (const s of sessions.filter((x) => x.type === "workshop")) {
      expect(s.capacity, s.title).toBeGreaterThan(0);
      expect(s.signupUrl, s.title).toBeTruthy();
    }
  });

  it("attaches no speakers to breaks or registration", () => {
    for (const s of sessions.filter((x) => x.type === "break" || x.type === "registration")) {
      expect(s.speakers ?? [], s.title).toHaveLength(0);
    }
  });

  it("gives every session a positive duration", () => {
    for (const s of sessions) {
      expect(s.durationMinutes, s.title).toBeGreaterThan(0);
    }
  });

  /**
   * Sanity stores a datetime exactly as given. Writing an offset form through
   * the API stores that string, while the Studio writes `Z`-suffixed UTC, and
   * GROQ compares datetime strings lexicographically unless explicitly cast —
   * so a dataset holding both forms filters incorrectly, silently.
   *
   * The first seeded programme had this: every session was stored as
   * `…T08:30:00-03:00`. The instants were right and every range query over
   * them would have been wrong.
   */
  it("normalises every start to UTC, so one representation is stored", () => {
    const notUtc = sessions.filter((s) => !s.startsAt.endsWith("Z")).map((s) => s.startsAt);
    expect(notUtc).toEqual([]);
  });

  it("still places sessions at the venue-local times the programme intends", () => {
    const registration = sessions.find((s) => s.slug.current === "acreditacion-dia-1");
    // 08:30 in Buenos Aires (UTC−3) is 11:30 UTC.
    expect(registration?.startsAt).toBe("2026-09-24T11:30:00.000Z");
  });
});

describe("the programme is worth looking at", () => {
  // A fixture set that exercises none of the interesting cases would let the
  // schedule look correct while proving nothing.
  it("spans both conference days", () => {
    const days = new Set(sessions.map((s) => venueDate(s.startsAt, VENUE_TIMEZONE)));
    expect([...days].sort()).toEqual([event.startDate, event.endDate]);
  });

  it("runs sessions in parallel rooms", () => {
    const atSameTime = sessions.filter((s) => s.startsAt === sessions[4]?.startsAt);
    expect(atSameTime.length).toBeGreaterThan(1);
  });

  it("uses every room", () => {
    const used = new Set(sessions.map((s) => s.track._ref));
    expect(used.size).toBe(rooms.length);
  });

  it("includes at least one speaker appearing more than once", () => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      for (const r of s.speakers ?? []) counts.set(r._ref, (counts.get(r._ref) ?? 0) + 1);
    }
    expect([...counts.values()].some((n) => n > 1)).toBe(true);
  });

  it("includes sessions in more than one language", () => {
    const languages = new Set(
      sessions.map((s) => (s as { language?: string }).language).filter(Boolean),
    );
    expect(languages.size).toBeGreaterThan(1);
  });

  // Some speakers have no biography on purpose: it is the state a real
  // programme is in for weeks, and it is what the warning rules exist for.
  it("leaves some speakers incomplete, so warnings have something to say", () => {
    const withoutBio = speakers.filter((s) => !(s as { bio?: unknown }).bio);
    expect(withoutBio.length).toBeGreaterThan(0);
  });
});
