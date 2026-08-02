import { describe, expect, it } from "vitest";

import { toSession, type RawSession, type Room, type ScheduledSession } from "@/lib/sanity/programme";

import { layOutDay, ROW_MINUTES, venueMinutesOfDay } from "./layout";

const BA = "America/Argentina/Buenos_Aires";
/** Half-hour offset. The reason this module works in local minutes. */
const KOLKATA = "Asia/Kolkata";

const AUDITORIO: Room = {
  id: "track-auditorio",
  name: "Auditorio",
  shortName: "AUD",
  slug: "auditorio",
  order: 1,
  capacity: null,
};
const NORTE: Room = {
  id: "track-norte",
  name: "Norte",
  shortName: "NOR",
  slug: "norte",
  order: 2,
  capacity: null,
};
const ROOMS = [AUDITORIO, NORTE];
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
  if (!built) throw new Error(`test fixture ${overrides.id} is not schedulable`);
  return built;
}

describe("venueMinutesOfDay", () => {
  it("reads the clock at the venue, not in UTC", () => {
    // 13:00Z is 10:00 in Buenos Aires.
    expect(venueMinutesOfDay("2026-09-24T13:00:00.000Z", BA)).toBe(10 * 60);
  });

  it("handles a timezone whose offset is not a whole hour", () => {
    // 13:00Z is 18:30 in Kolkata.
    expect(venueMinutesOfDay("2026-09-24T13:00:00.000Z", KOLKATA)).toBe(18 * 60 + 30);
  });

  it("puts local midnight at minute zero rather than at 1440", () => {
    expect(venueMinutesOfDay("2026-09-24T03:00:00.000Z", BA)).toBe(0);
  });
});

describe("layOutDay", () => {
  it("starts the axis on the hour before the first session", () => {
    // 08:30 local.
    const layout = layOutDay([session({ id: "a", startsAt: "2026-09-24T11:30:00.000Z" })], ROOMS, BA);
    expect(layout.fromMinute).toBe(8 * 60);
    expect(layout.hours[0]).toEqual({ hour: 8, row: 1 });
  });

  it("ends the axis on the hour after the last session ends", () => {
    const layout = layOutDay(
      [session({ id: "a", startsAt: "2026-09-24T20:00:00.000Z", durationMinutes: 50 })],
      ROOMS,
      BA,
    );
    // 17:00 local, ending 17:50, so the axis runs to 18:00.
    expect(layout.toMinute).toBe(18 * 60);
  });

  it("gives a session a span proportional to its duration", () => {
    const layout = layOutDay(
      [
        session({ id: "short", startsAt: "2026-09-24T13:00:00.000Z", durationMinutes: 30 }),
        session({
          id: "long",
          startsAt: "2026-09-24T14:00:00.000Z",
          durationMinutes: 90,
          roomId: NORTE.id,
        }),
      ],
      ROOMS,
      BA,
    );
    expect(layout.placements.get("short")?.span).toBe(30 / ROW_MINUTES);
    expect(layout.placements.get("long")?.span).toBe(90 / ROW_MINUTES);
  });

  it("places a session in the column of the room it is actually in", () => {
    const layout = layOutDay(
      [
        session({ id: "a" }),
        session({ id: "b", roomId: NORTE.id, startsAt: "2026-09-24T15:00:00.000Z" }),
      ],
      ROOMS,
      BA,
    );
    // Column 1 is the time axis.
    expect(layout.placements.get("a")?.column).toBe(2);
    expect(layout.placements.get("b")?.column).toBe(3);
  });

  it("follows a moved session into its new column", () => {
    const layout = layOutDay(
      [session({ id: "a", status: { state: "moved", movedToRoomId: NORTE.id } })],
      ROOMS,
      BA,
    );
    expect(layout.placements.get("a")?.column).toBe(3);
  });

  it("places a delayed session at the time it will actually start", () => {
    const layout = layOutDay(
      [
        session({
          id: "a",
          startsAt: "2026-09-24T13:00:00.000Z",
          status: { state: "delayed", delayMinutes: 30 },
        }),
      ],
      ROOMS,
      BA,
    );
    // The axis starts at 10:00 local; the session now runs at 10:30.
    expect(layout.fromMinute).toBe(10 * 60);
    expect(layout.placements.get("a")?.row).toBe(30 / ROW_MINUTES + 1);
  });

  it("aligns rows correctly in a half-hour-offset timezone", () => {
    const layout = layOutDay(
      [
        session({ id: "a", startsAt: "2026-09-24T13:00:00.000Z" }), // 18:30 local
        session({
          id: "b",
          startsAt: "2026-09-24T14:00:00.000Z",
          roomId: NORTE.id,
        }), // 19:30 local
      ],
      ROOMS,
      KOLKATA,
    );
    expect(layout.fromMinute).toBe(18 * 60);
    expect(layout.placements.get("a")?.row).toBe(30 / ROW_MINUTES + 1);
    expect(layout.placements.get("b")?.row).toBe(90 / ROW_MINUTES + 1);
  });

  it("returns a usable grid for a day with no sessions", () => {
    const layout = layOutDay([], ROOMS, BA);
    expect(layout.rowCount).toBeGreaterThan(0);
    expect(layout.hours.length).toBeGreaterThan(0);
    expect(layout.placements.size).toBe(0);
  });

  it("clamps a session running past midnight instead of wrapping it to the top", () => {
    const layout = layOutDay(
      [
        session({
          id: "party",
          startsAt: "2026-09-25T02:00:00.000Z", // 23:00 local
          durationMinutes: 180,
        }),
      ],
      ROOMS,
      BA,
    );
    const placement = layout.placements.get("party");
    expect(layout.toMinute).toBe(24 * 60);
    expect(placement?.row).toBe(1);
    expect((placement?.row ?? 0) + (placement?.span ?? 0) - 1).toBe(layout.rowCount);
  });

  it("labels every hour on the axis, once", () => {
    const layout = layOutDay(
      [
        session({ id: "a", startsAt: "2026-09-24T13:00:00.000Z", durationMinutes: 60 }),
        session({
          id: "b",
          startsAt: "2026-09-24T16:00:00.000Z",
          durationMinutes: 60,
          roomId: NORTE.id,
        }),
      ],
      ROOMS,
      BA,
    );
    expect(layout.hours.map((mark) => mark.hour)).toEqual([10, 11, 12, 13]);
  });
});
