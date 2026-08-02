import { describe, expect, it } from "vitest";

import { toSession, type RawSession, type Room } from "@/lib/sanity/programme";

import {
  changedFromInstant,
  changedFromRoom,
  formatDayHeading,
  formatDayLabel,
  formatOffset,
  formatStatus,
  formatTime,
  formatZoneName,
} from "./format";

const BA = "America/Argentina/Buenos_Aires";
const BERLIN = "Europe/Berlin";

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
  name: "Sala Norte",
  shortName: "NOR",
  slug: "norte",
  order: 2,
  capacity: null,
};
const roomsById = new Map([AUDITORIO, NORTE].map((room) => [room.id, room]));

function session(overrides: Partial<RawSession> = {}) {
  const built = toSession(
    {
      id: "s",
      slug: "s",
      title: "s",
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

describe("formatTime", () => {
  it("renders the same instant differently in two zones", () => {
    // This is the whole substance of the timezone toggle: one instant, two
    // correct answers. The client component picks the zone; the arithmetic is
    // here, where it can be checked without a browser.
    expect(formatTime("2026-09-24T13:00:00.000Z", BA)).toBe("10:00");
    expect(formatTime("2026-09-24T13:00:00.000Z", BERLIN)).toBe("15:00");
  });

  it("pads to five characters so a column of times aligns", () => {
    expect(formatTime("2026-09-24T12:05:00.000Z", BA)).toBe("09:05");
    expect(formatTime("2026-09-24T03:30:00.000Z", BA)).toBe("00:30");
  });
});

describe("formatOffset", () => {
  it("uses a minus sign rather than a hyphen", () => {
    expect(formatOffset("2026-09-24T13:00:00.000Z", BA)).toBe("UTC−3");
  });

  it("reports the offset in force at that instant, not a fixed one", () => {
    // Berlin is UTC+2 in September and UTC+1 in January. A constant label
    // would disagree with the times printed beside it for half the year.
    expect(formatOffset("2026-09-24T13:00:00.000Z", BERLIN)).toBe("UTC+2");
    expect(formatOffset("2026-01-15T13:00:00.000Z", BERLIN)).toBe("UTC+1");
  });
});

describe("formatZoneName", () => {
  it("leaves a zone with no underscores alone", () => {
    expect(formatZoneName(BERLIN)).toBe("Europe/Berlin");
  });

  // The slashes stay, because they are what makes the string recognisable as
  // an IANA identifier. Only the underscores go, and only because they read as
  // a formatting accident rather than as part of a place name.
  it("spells the identifier out rather than showing its underscores", () => {
    expect(formatZoneName(BA)).toBe("America/Argentina/Buenos Aires");
  });
});

describe("day labels", () => {
  it("reads a plain date in UTC, so the label never slips a day", () => {
    expect(formatDayLabel("2026-09-24")).toBe("Thu 24 Sept");
    expect(formatDayHeading("2026-09-24")).toBe("Thursday 24 September");
  });
});

describe("formatStatus", () => {
  it("says nothing about a session running as planned", () => {
    expect(formatStatus(session())).toBeNull();
  });

  it("quantifies a delay when there is a number, and states it when there is not", () => {
    expect(formatStatus(session({ status: { state: "delayed", delayMinutes: 15 } }))).toBe(
      "Delayed 15 min",
    );
    expect(formatStatus(session({ status: { state: "delayed" } }))).toBe("Delayed");
  });

  it("names the destination room when a session has moved", () => {
    expect(formatStatus(session({ status: { state: "moved", movedToRoomId: NORTE.id } }))).toBe(
      "Moved to Sala Norte",
    );
  });

  it("says a cancelled session is cancelled", () => {
    expect(formatStatus(session({ status: { state: "cancelled" } }))).toBe("Cancelled");
  });
});

describe("what changed", () => {
  it("reports the time a delayed session was supposed to start", () => {
    expect(changedFromInstant(session({ status: { state: "delayed", delayMinutes: 15 } }))).toBe(
      "2026-09-24T13:00:00.000Z",
    );
  });

  it("reports nothing when the delay did not survive normalisation", () => {
    expect(changedFromInstant(session({ status: { state: "onTime", delayMinutes: 15 } }))).toBeNull();
  });

  it("reports the room a moved session was supposed to be in", () => {
    expect(changedFromRoom(session({ status: { state: "moved", movedToRoomId: NORTE.id } }))).toBe(
      "Auditorio",
    );
  });

  it("reports nothing when a move did not actually change the room", () => {
    expect(
      changedFromRoom(session({ status: { state: "moved", movedToRoomId: AUDITORIO.id } })),
    ).toBeNull();
  });
});
