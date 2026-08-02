"use client";

import { useSyncExternalStore } from "react";

import { formatTime } from "@/lib/schedule/format";
import { ROW_MINUTES, venueMinutesOfDay } from "@/lib/schedule/layout";

/**
 * A line across the grid at the current time.
 *
 * The second thing on this page that cannot be a Server Component: it needs a
 * clock that keeps running, and a server rendered it once. Nothing is drawn on
 * the server or during hydration -- the marker's position depends on the
 * current time, so a server-rendered position would be wrong by however long
 * the response sat in a cache, which given this page is cached for a minute is
 * exactly the error the marker exists not to have.
 *
 * The clock is an external store rather than state on a timer. Time is a thing
 * outside React that changes on its own, which is precisely what
 * `useSyncExternalStore` subscribes to, and the snapshot is bucketed to
 * `TICK_MS` so that reading it twice in one render returns the same value.
 * That bucketing is not a detail: a snapshot returning `Date.now()` directly
 * is never equal to itself and re-renders forever.
 *
 * The marker is drawn only where there is a time axis to mark, which is the
 * desktop grid. On a phone the schedule is a list with no vertical time scale,
 * so a line across it would point at nothing; there, the day defaulting to
 * today is what answers "what is on now".
 */

/** Half the smallest row, so the marker is never visibly behind the grid. */
const TICK_MS = 30_000;

function subscribe(onChange: () => void): () => void {
  // Polled more often than the bucket changes, so a tick landing slightly
  // early does not skip a bucket entirely.
  const timer = setInterval(onChange, TICK_MS / 3);
  return () => clearInterval(timer);
}

export function NowMarker({
  date,
  fromMinute,
  rowCount,
  timeZone,
}: {
  /** The day being displayed, `YYYY-MM-DD` in venue time. */
  date: string;
  fromMinute: number;
  rowCount: number;
  timeZone: string;
}) {
  const bucket = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK_MS),
    () => null,
  );

  if (bucket === null) return null;
  const now = new Date(bucket * TICK_MS);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  if (today !== date) return null;

  const rows = (venueMinutesOfDay(now, timeZone) - fromMinute) / ROW_MINUTES;
  if (rows < 0 || rows > rowCount) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 hidden lg:block"
      style={{ top: `calc(var(--spacing-row) * ${rows})` }}
    >
      <div className="flex items-center gap-2">
        <span className="tabular w-[3.75rem] pr-3 text-right text-xs font-medium text-accent">
          {formatTime(now, timeZone)}
        </span>
        <span className="h-px flex-1 bg-accent/70" />
      </div>
    </div>
  );
}
