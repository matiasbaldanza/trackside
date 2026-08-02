import { describe, expect, it } from "vitest";

import type { Day, Room, ScheduledSession } from "@/lib/sanity";
import { toSession, type RawSession } from "@/lib/sanity/programme";

import { filterDay, resolveSelection, scheduleHref, visibleRooms } from "./filters";

const BA = "America/Argentina/Buenos_Aires";

const AUDITORIO: Room = {
  id: "track-auditorio",
  name: "Auditorio",
  shortName: "AUD",
  slug: "auditorio",
  order: 1,
  capacity: null,
};
const LAB: Room = {
  id: "track-lab",
  name: "Laboratorio",
  shortName: "LAB",
  slug: "laboratorio",
  order: 2,
  capacity: 30,
};
const ROOMS = [AUDITORIO, LAB];
const roomsById = new Map(ROOMS.map((room) => [room.id, room]));

function session(overrides: Partial<RawSession> & { id: string }): ScheduledSession {
  const built = toSession(
    {
      slug: overrides.id,
      title: overrides.id,
      startsAt: "2026-09-24T13:00:00.000Z",
      durationMinutes: 40,
      roomId: AUDITORIO.id,
      ...overrides,
    },
    roomsById,
  );
  if (!built) throw new Error("fixture is not schedulable");
  return built;
}

const DAYS: Day[] = [
  { date: "2026-09-24", sessions: [] },
  { date: "2026-09-25", sessions: [] },
];

describe("resolveSelection", () => {
  it("honours a day that the programme has", () => {
    const selection = resolveSelection({ day: "2026-09-25" }, DAYS, ROOMS, BA);
    expect(selection.day).toBe("2026-09-25");
  });

  it("opens on today when the conference is running", () => {
    // 12:00Z on the 25th is 09:00 in Buenos Aires, the second morning.
    const selection = resolveSelection(
      {},
      DAYS,
      ROOMS,
      BA,
      new Date("2026-09-25T12:00:00.000Z"),
    );
    expect(selection.day).toBe("2026-09-25");
  });

  it("uses the venue's today, not the reader's", () => {
    // 02:00Z on the 25th is still 23:00 on the 24th in Buenos Aires. A reader
    // in Berlin, where it is already the 25th, should see the same page as
    // someone standing in the venue.
    const selection = resolveSelection(
      {},
      DAYS,
      ROOMS,
      BA,
      new Date("2026-09-25T02:00:00.000Z"),
    );
    expect(selection.day).toBe("2026-09-24");
  });

  it("opens on the first day when the conference is not running", () => {
    const selection = resolveSelection(
      {},
      DAYS,
      ROOMS,
      BA,
      new Date("2026-06-01T12:00:00.000Z"),
    );
    expect(selection.day).toBe("2026-09-24");
  });

  it("falls back rather than showing nothing for a day that does not exist", () => {
    expect(resolveSelection({ day: "2026-01-01" }, DAYS, ROOMS, BA).day).toBe("2026-09-24");
    expect(resolveSelection({ day: "nonsense" }, DAYS, ROOMS, BA).day).toBe("2026-09-24");
  });

  it("ignores a room slug that does not exist", () => {
    expect(resolveSelection({ room: "auditorio" }, DAYS, ROOMS, BA).room).toBe("auditorio");
    expect(resolveSelection({ room: "kitchen" }, DAYS, ROOMS, BA).room).toBeNull();
  });

  it("takes the first value when a parameter is repeated in the URL", () => {
    const selection = resolveSelection(
      { day: ["2026-09-25", "2026-09-24"], room: ["laboratorio"] },
      DAYS,
      ROOMS,
      BA,
    );
    expect(selection).toEqual({ day: "2026-09-25", room: "laboratorio" });
  });
});

describe("visibleRooms", () => {
  it("draws every column when no room is selected", () => {
    expect(visibleRooms(ROOMS, { day: "2026-09-24", room: null })).toHaveLength(2);
  });

  it("draws one column when a room is selected", () => {
    expect(visibleRooms(ROOMS, { day: "2026-09-24", room: "laboratorio" })).toEqual([LAB]);
  });
});

describe("filterDay", () => {
  const day: Day = {
    date: "2026-09-24",
    sessions: [
      session({ id: "a" }),
      session({ id: "b", roomId: LAB.id }),
      session({ id: "moved", status: { state: "moved", movedToRoomId: LAB.id } }),
    ],
  };

  it("returns the day untouched when no room is selected", () => {
    expect(filterDay(day, { day: day.date, room: null })).toBe(day);
  });

  it("keeps only the selected room", () => {
    const filtered = filterDay(day, { day: day.date, room: "auditorio" });
    expect(filtered.sessions.map((s) => s.id)).toEqual(["a"]);
  });

  it("follows a moved session into the room it is now in", () => {
    const filtered = filterDay(day, { day: day.date, room: "laboratorio" });
    expect(filtered.sessions.map((s) => s.id)).toEqual(["b", "moved"]);
  });
});

describe("scheduleHref", () => {
  it("keeps the parameters it was not asked to change", () => {
    expect(scheduleHref({ day: "2026-09-24", tz: "local" }, { room: "laboratorio" })).toBe(
      "/?day=2026-09-24&room=laboratorio&tz=local",
    );
  });

  it("drops a parameter set back to its default", () => {
    expect(scheduleHref({ day: "2026-09-24", room: "laboratorio" }, { room: null })).toBe(
      "/?day=2026-09-24",
    );
  });

  it("produces a plain URL when nothing is selected", () => {
    expect(scheduleHref({}, {})).toBe("/");
  });
});
