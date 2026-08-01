import { describe, expect, it } from "vitest";

import {
  conferenceDays,
  endsAt,
  findTrackConflicts,
  formatDuration,
  formatSessionPreview,
  formatStatusBadge,
  isSchedulable,
  isWithinEvent,
  overlaps,
  venueDate,
} from "./scheduling";

const BA = "America/Argentina/Buenos_Aires";

/** Nodo Conf's shape: two days, in Buenos Aires. */
const nodoConf = { startDate: "2026-09-24", endDate: "2026-09-25", timezone: BA };

/** 2026-09-24, 10:00 in Buenos Aires (UTC−3) is 13:00 UTC. */
const at = (utc: string, durationMinutes = 40) => ({ startsAt: utc, durationMinutes });

describe("endsAt", () => {
  it("adds the duration to the start", () => {
    expect(endsAt(at("2026-09-24T13:00:00Z", 40)).toISOString()).toBe("2026-09-24T13:40:00.000Z");
  });

  it("crosses midnight without special handling", () => {
    expect(endsAt(at("2026-09-24T23:30:00Z", 60)).toISOString()).toBe("2026-09-25T00:30:00.000Z");
  });
});

describe("overlaps", () => {
  it("detects a session starting inside another", () => {
    expect(overlaps(at("2026-09-24T13:00:00Z", 60), at("2026-09-24T13:30:00Z", 30))).toBe(true);
  });

  it("detects one session wholly containing another", () => {
    expect(overlaps(at("2026-09-24T13:00:00Z", 120), at("2026-09-24T13:30:00Z", 15))).toBe(true);
  });

  // The rule exists to catch double-booked rooms. If it also flagged the
  // ordinary case of one talk following another, editors would learn to
  // ignore it.
  it("treats back-to-back sessions as compatible", () => {
    expect(overlaps(at("2026-09-24T13:00:00Z", 30), at("2026-09-24T13:30:00Z", 30))).toBe(false);
  });

  it("is symmetric", () => {
    const a = at("2026-09-24T13:00:00Z", 60);
    const b = at("2026-09-24T13:30:00Z", 60);
    expect(overlaps(a, b)).toBe(overlaps(b, a));
  });

  it("does not overlap a session on the following day", () => {
    expect(overlaps(at("2026-09-24T13:00:00Z", 60), at("2026-09-25T13:00:00Z", 60))).toBe(false);
  });
});

describe("isSchedulable", () => {
  it.each([
    ["a complete session", { startsAt: "2026-09-24T13:00:00Z", durationMinutes: 40 }, true],
    ["no start", { durationMinutes: 40 }, false],
    ["no duration", { startsAt: "2026-09-24T13:00:00Z" }, false],
    ["zero duration", { startsAt: "2026-09-24T13:00:00Z", durationMinutes: 0 }, false],
    ["negative duration", { startsAt: "2026-09-24T13:00:00Z", durationMinutes: -30 }, false],
    ["unparseable start", { startsAt: "soon", durationMinutes: 40 }, false],
  ])("%s → %s", (_label, input, expected) => {
    expect(isSchedulable(input)).toBe(expected);
  });
});

describe("findTrackConflicts", () => {
  const subject = at("2026-09-24T13:00:00Z", 60);

  it("returns the sessions that collide", () => {
    const conflicts = findTrackConflicts(subject, [
      { _id: "a", title: "Overlapping", ...at("2026-09-24T13:30:00Z", 30) },
      { _id: "b", title: "Later", ...at("2026-09-24T15:00:00Z", 30) },
    ]);
    expect(conflicts.map((c) => c._id)).toEqual(["a"]);
  });

  // An incomplete session is a different problem, reported against the
  // document that is actually incomplete.
  it("ignores candidates that are not yet schedulable", () => {
    expect(
      findTrackConflicts(subject, [{ _id: "draft", title: "No time yet", startsAt: "", durationMinutes: 0 }]),
    ).toEqual([]);
  });

  it("returns nothing when the subject itself is incomplete", () => {
    expect(
      findTrackConflicts({ startsAt: "", durationMinutes: 0 }, [
        { _id: "a", ...at("2026-09-24T13:00:00Z", 60) },
      ]),
    ).toEqual([]);
  });

  it("finds every conflict, not only the first", () => {
    const conflicts = findTrackConflicts(at("2026-09-24T13:00:00Z", 180), [
      { _id: "a", ...at("2026-09-24T13:30:00Z", 30) },
      { _id: "b", ...at("2026-09-24T14:30:00Z", 30) },
      { _id: "c", ...at("2026-09-24T17:00:00Z", 30) },
    ]);
    expect(conflicts.map((c) => c._id)).toEqual(["a", "b"]);
  });
});

describe("venueDate", () => {
  it("converts an instant to the venue's calendar date", () => {
    expect(venueDate("2026-09-24T13:00:00Z", BA)).toBe("2026-09-24");
  });

  // The case the venue timezone exists for. In UTC this instant is already
  // the 25th; in Buenos Aires the session is still running on the 24th.
  it("keeps a late session on the venue's day, not UTC's", () => {
    expect(venueDate("2026-09-25T02:00:00Z", BA)).toBe("2026-09-24");
    expect(venueDate("2026-09-25T02:00:00Z", "UTC")).toBe("2026-09-25");
  });

  it("sorts lexicographically", () => {
    const dates = ["2026-09-25T13:00:00Z", "2026-09-24T13:00:00Z"].map((i) => venueDate(i, BA));
    expect([...dates].sort()).toEqual(["2026-09-24", "2026-09-25"]);
  });
});

describe("conferenceDays", () => {
  it("includes both ends", () => {
    expect(conferenceDays(nodoConf)).toEqual(["2026-09-24", "2026-09-25"]);
  });

  it("handles a single-day event", () => {
    expect(conferenceDays({ ...nodoConf, endDate: "2026-09-24" })).toEqual(["2026-09-24"]);
  });

  it("crosses a month boundary", () => {
    expect(conferenceDays({ ...nodoConf, startDate: "2026-09-30", endDate: "2026-10-02" })).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("returns nothing when the range is inverted", () => {
    expect(conferenceDays({ ...nodoConf, startDate: "2026-09-25", endDate: "2026-09-24" })).toEqual([]);
  });

  it("returns nothing for unparseable dates", () => {
    expect(conferenceDays({ ...nodoConf, startDate: "not a date" })).toEqual([]);
  });
});

describe("isWithinEvent", () => {
  it("accepts a session on the first day", () => {
    expect(isWithinEvent(at("2026-09-24T13:00:00Z", 60), nodoConf)).toBe(true);
  });

  it("rejects a session the day before the conference", () => {
    expect(isWithinEvent(at("2026-09-23T13:00:00Z", 60), nodoConf)).toBe(false);
  });

  it("rejects a session the day after the conference", () => {
    expect(isWithinEvent(at("2026-09-26T13:00:00Z", 60), nodoConf)).toBe(false);
  });

  // 21:00 to midnight, venue time. The end instant lands on the 26th, but
  // the session ran entirely on the 25th.
  it("accepts a session ending exactly at midnight on the last day", () => {
    expect(isWithinEvent(at("2026-09-26T00:00:00Z", 180), nodoConf)).toBe(true);
  });

  it("rejects a session that runs past the final midnight", () => {
    expect(isWithinEvent(at("2026-09-26T00:00:00Z", 181), nodoConf)).toBe(false);
  });
});

describe("formatDuration", () => {
  it.each([
    [40, "40 min"],
    [60, "1h"],
    [90, "1h 30m"],
    [120, "2h"],
    [0, ""],
    [-10, ""],
  ])("%i → %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("formatStatusBadge", () => {
  it.each([
    ["onTime", undefined, ""],
    [undefined, undefined, ""],
    ["delayed", 15, "Delayed +15m"],
    ["delayed", undefined, "Delayed"],
    ["moved", undefined, "Moved"],
    ["cancelled", undefined, "Cancelled"],
  ])("%s/%s → %s", (state, delay, expected) => {
    expect(formatStatusBadge(state, delay)).toBe(expected);
  });
});

describe("formatSessionPreview room naming", () => {
  const base = { title: "Keynote", startsAt: "2026-09-24T12:30:00Z", durationMinutes: 45 };

  // Full room names truncated the subtitle in the Studio's list pane, and the
  // duration was what disappeared -- the part an operator most needs.
  it("prefers the room's short name", () => {
    const { subtitle } = formatSessionPreview({
      ...base,
      trackName: "Auditorio Principal",
      trackShortName: "AUD",
    });
    expect(subtitle).toContain("AUD");
    expect(subtitle).not.toContain("Auditorio Principal");
    expect(subtitle).toContain("45 min");
  });

  it("falls back to the full name when there is no short one", () => {
    const { subtitle } = formatSessionPreview({ ...base, trackName: "Auditorio Principal" });
    expect(subtitle).toContain("Auditorio Principal");
  });

  it("keeps a status badge last, where it reads as an exception", () => {
    const { subtitle } = formatSessionPreview({
      ...base,
      trackShortName: "AUD",
      state: "delayed",
      delayMinutes: 15,
    });
    expect(subtitle?.endsWith("Delayed +15m")).toBe(true);
  });
});
