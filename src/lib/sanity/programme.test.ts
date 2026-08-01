import { describe, expect, it } from "vitest";

import {
  MissingContentError,
  toDays,
  toProgramme,
  toRooms,
  toSession,
  toSessionDetail,
  toStatus,
  type RawProgramme,
  type RawSession,
  type Room,
} from "./programme";

/**
 * These tests cover the boundary between Sanity's documents and the model the
 * interface renders. They are where the `liveStatus` contract is proven --
 * that hidden fields stay hidden, that a delay actually moves a time, and that
 * a session nobody can place does not silently appear in the wrong room.
 *
 * The inputs are constructed by hand rather than fetched. Everything under
 * test is a pure function, so a network round trip would add nothing except a
 * reason for the suite to fail on a Monday.
 */

const AUDITORIO: Room = {
  id: "track-auditorio",
  name: "Auditorio Principal",
  shortName: "AUD",
  slug: "auditorio",
  order: 1,
  capacity: 400,
};

const TALLER: Room = {
  id: "track-taller",
  name: "Taller",
  shortName: "TAL",
  slug: "taller",
  order: 2,
  capacity: 40,
};

const roomsById = new Map([
  [AUDITORIO.id, AUDITORIO],
  [TALLER.id, TALLER],
]);

const EVENT = {
  startDate: "2026-09-10",
  endDate: "2026-09-11",
  timezone: "America/Argentina/Buenos_Aires",
};

function rawSession(overrides: Partial<RawSession> = {}): RawSession {
  return {
    id: "session-apertura",
    slug: "apertura",
    title: "Apertura",
    type: "keynote",
    startsAt: "2026-09-10T13:00:00.000Z",
    durationMinutes: 40,
    roomId: AUDITORIO.id,
    ...overrides,
  };
}

describe("toRooms", () => {
  it("orders by display order, not by name", () => {
    const rooms = toRooms([
      { id: "b", name: "Beta", slug: "beta", order: 2 },
      { id: "a", name: "Alpha", slug: "alpha", order: 1 },
    ]);
    expect(rooms.map((room) => room.id)).toEqual(["a", "b"]);
  });

  it("falls back to the full name when there is no short name", () => {
    const [room] = toRooms([{ id: "a", name: "Alpha", slug: "alpha", order: 1 }]);
    expect(room.shortName).toBe("Alpha");
  });

  it("drops rooms with no slug, which cannot be linked to", () => {
    expect(toRooms([{ id: "a", name: "Alpha", slug: null, order: 1 }])).toHaveLength(0);
  });
});

describe("toStatus", () => {
  it("defaults to on time when there is no status at all", () => {
    expect(toStatus(null, roomsById)).toEqual({
      state: "onTime",
      delayMinutes: null,
      movedTo: null,
      note: null,
    });
  });

  // The reason this module exists. `hidden` in the schema controls visibility,
  // not data, so a delay set and then reverted is still in the document.
  it("ignores a delay left behind by a status that is no longer delayed", () => {
    const status = toStatus({ state: "onTime", delayMinutes: 20 }, roomsById);
    expect(status.delayMinutes).toBeNull();
  });

  it("ignores a destination room left behind by a status that is no longer moved", () => {
    const status = toStatus(
      { state: "delayed", delayMinutes: 15, movedToRoomId: TALLER.id },
      roomsById,
    );
    expect(status.movedTo).toBeNull();
    expect(status.delayMinutes).toBe(15);
  });

  it("resolves the destination room when the session really has moved", () => {
    const status = toStatus({ state: "moved", movedToRoomId: TALLER.id }, roomsById);
    expect(status.movedTo).toEqual(TALLER);
  });

  it("treats a delay of zero as no delay", () => {
    expect(toStatus({ state: "delayed", delayMinutes: 0 }, roomsById).delayMinutes).toBeNull();
  });

  it("falls back to on time for a state the interface cannot render", () => {
    expect(toStatus({ state: "postponed-indefinitely" }, roomsById).state).toBe("onTime");
  });

  it("keeps a note whatever the state, and discards a blank one", () => {
    expect(toStatus({ state: "cancelled", note: "  Speaker unwell  " }, roomsById).note).toBe(
      "Speaker unwell",
    );
    expect(toStatus({ state: "cancelled", note: "   " }, roomsById).note).toBeNull();
  });
});

describe("toSession", () => {
  it("keeps the planned time and the effective time apart when delayed", () => {
    const session = toSession(
      rawSession({ status: { state: "delayed", delayMinutes: 25 } }),
      roomsById,
    );
    expect(session?.plannedStartsAt).toBe("2026-09-10T13:00:00.000Z");
    expect(session?.startsAt).toBe("2026-09-10T13:25:00.000Z");
    expect(session?.endsAt).toBe("2026-09-10T14:05:00.000Z");
  });

  it("does not move a session whose delay was reverted", () => {
    const session = toSession(
      rawSession({ status: { state: "onTime", delayMinutes: 25 } }),
      roomsById,
    );
    expect(session?.startsAt).toBe(session?.plannedStartsAt);
  });

  it("places a moved session in its new room and remembers the old one", () => {
    const session = toSession(
      rawSession({ status: { state: "moved", movedToRoomId: TALLER.id } }),
      roomsById,
    );
    expect(session?.room).toEqual(TALLER);
    expect(session?.plannedRoom).toEqual(AUDITORIO);
  });

  it("leaves a cancelled session in the slot the printed programme gave it", () => {
    const session = toSession(rawSession({ status: { state: "cancelled" } }), roomsById);
    expect(session?.startsAt).toBe("2026-09-10T13:00:00.000Z");
    expect(session?.room).toEqual(AUDITORIO);
  });

  it("returns null rather than guessing when the room does not resolve", () => {
    expect(toSession(rawSession({ roomId: "track-that-was-deleted" }), roomsById)).toBeNull();
  });

  it("returns null for a session that cannot be placed on a grid", () => {
    expect(toSession(rawSession({ startsAt: null }), roomsById)).toBeNull();
    expect(toSession(rawSession({ durationMinutes: 0 }), roomsById)).toBeNull();
    expect(toSession(rawSession({ slug: null }), roomsById)).toBeNull();
  });

  it("normalises the stored instant, whatever offset it was written with", () => {
    const session = toSession(rawSession({ startsAt: "2026-09-10T10:00:00-03:00" }), roomsById);
    expect(session?.plannedStartsAt).toBe("2026-09-10T13:00:00.000Z");
  });

  it("falls back to a renderable type for one the interface does not know", () => {
    expect(toSession(rawSession({ type: "fireside-chat" }), roomsById)?.type).toBe("talk");
  });

  it("keeps speakers in their credited order and drops incomplete ones", () => {
    const session = toSession(
      rawSession({
        speakers: [
          { id: "s2", name: "Beatriz Roldán" },
          { id: "s1", name: null },
          { id: "s3", name: "Ana Costa", jobTitle: "Staff Engineer" },
        ],
      }),
      roomsById,
    );
    expect(session?.speakers.map((speaker) => speaker.name)).toEqual([
      "Beatriz Roldán",
      "Ana Costa",
    ]);
  });

  it("treats an unset boolean as false rather than as unknown", () => {
    const session = toSession(rawSession({ captioned: null, recorded: null }), roomsById);
    expect(session?.captioned).toBe(false);
    expect(session?.recorded).toBe(false);
  });
});

describe("toDays", () => {
  const sessions = [
    toSession(rawSession({ id: "a", slug: "a", startsAt: "2026-09-10T13:00:00.000Z" }), roomsById)!,
    toSession(rawSession({ id: "b", slug: "b", startsAt: "2026-09-11T13:00:00.000Z" }), roomsById)!,
  ];

  it("groups by the venue's day, not by UTC", () => {
    // 23:30 in Buenos Aires is already the next day in UTC. Grouping on the
    // raw timestamp would file every late session under tomorrow.
    const late = toSession(
      rawSession({ id: "late", slug: "late", startsAt: "2026-09-11T02:30:00.000Z" }),
      roomsById,
    )!;
    const days = toDays([late], EVENT);
    expect(days.find((day) => day.sessions.length > 0)?.date).toBe("2026-09-10");
  });

  it("keeps days with no sessions", () => {
    const days = toDays([sessions[0]], EVENT);
    expect(days.map((day) => day.date)).toEqual(["2026-09-10", "2026-09-11"]);
    expect(days[1].sessions).toHaveLength(0);
  });

  it("surfaces a session outside the conference rather than hiding it", () => {
    const stray = toSession(
      rawSession({ id: "stray", slug: "stray", startsAt: "2026-09-12T13:00:00.000Z" }),
      roomsById,
    )!;
    const days = toDays([stray], EVENT);
    expect(days.map((day) => day.date)).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
    expect(days[2].sessions).toHaveLength(1);
  });

  it("orders a day by time, then by room, so the grid reads left to right", () => {
    const first = toSession(
      rawSession({ id: "1", slug: "1", startsAt: "2026-09-10T14:00:00.000Z", roomId: TALLER.id }),
      roomsById,
    )!;
    const second = toSession(
      rawSession({ id: "2", slug: "2", startsAt: "2026-09-10T14:00:00.000Z" }),
      roomsById,
    )!;
    const days = toDays([first, second, sessions[0]], EVENT);
    expect(days[0].sessions.map((session) => session.id)).toEqual(["a", "2", "1"]);
  });

  it("files a delayed session under the day it will actually run on", () => {
    // 23:50 local, delayed by half an hour, is tomorrow.
    const late = toSession(
      rawSession({
        id: "late",
        slug: "late",
        startsAt: "2026-09-11T02:50:00.000Z",
        status: { state: "delayed", delayMinutes: 30 },
      }),
      roomsById,
    )!;
    const days = toDays([late], EVENT);
    expect(days.find((day) => day.sessions.length > 0)?.date).toBe("2026-09-11");
  });
});

describe("toProgramme", () => {
  const raw: RawProgramme = {
    event: {
      name: "Nodo Conf",
      startDate: "2026-09-10",
      endDate: "2026-09-11",
      timezone: "America/Argentina/Buenos_Aires",
    },
    rooms: [
      { id: AUDITORIO.id, name: AUDITORIO.name, shortName: "AUD", slug: "auditorio", order: 1 },
    ],
    sessions: [rawSession(), rawSession({ id: "broken", slug: "broken", roomId: "gone" })],
  };

  it("builds a programme and drops what it cannot place", () => {
    const programme = toProgramme(raw);
    expect(programme.event.name).toBe("Nodo Conf");
    expect(programme.rooms).toHaveLength(1);
    expect(programme.days.flatMap((day) => day.sessions)).toHaveLength(1);
  });

  it("fails loudly on a dataset with no event, rather than rendering an empty page", () => {
    expect(() => toProgramme({ ...raw, event: null })).toThrow(MissingContentError);
    expect(() => toProgramme({ ...raw, event: { name: "Nodo Conf" } })).toThrow(
      MissingContentError,
    );
  });

  it("treats a seeded event with no sessions as an empty programme, not an error", () => {
    const programme = toProgramme({ ...raw, sessions: [] });
    expect(programme.days).toHaveLength(2);
    expect(programme.days.every((day) => day.sessions.length === 0)).toBe(true);
  });
});

describe("toSessionDetail", () => {
  it("adds the fields only the detail page needs", () => {
    const detail = toSessionDetail(
      { ...rawSession(), abstract: "  Cómo empezó todo.  ", capacity: 40, signupUrl: "https://e" },
      [AUDITORIO],
    );
    expect(detail?.abstract).toBe("Cómo empezó todo.");
    expect(detail?.capacity).toBe(40);
    expect(detail?.title).toBe("Apertura");
  });

  it("returns null for a slug that matched nothing", () => {
    expect(toSessionDetail(null, [AUDITORIO])).toBeNull();
  });
});
