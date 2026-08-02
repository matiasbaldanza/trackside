"use client";

import { useSyncExternalStore } from "react";

import { formatTime, formatZoneLabel } from "@/lib/schedule/format";

/**
 * The same session, in the reader's own timezone.
 *
 * The schedule offers a toggle because a grid has room for one time per
 * session and the reader has to choose which. A detail page has room for both,
 * so it shows both and nobody chooses: venue time is the heading, and this is
 * the line underneath.
 *
 * That also keeps the page statically renderable. Reading the toggle from the
 * query string would make every session page render per request to carry a
 * preference the browser has to resolve anyway.
 *
 * Renders nothing when the reader is already in the venue's timezone -- which
 * is most of the audience at a conference with a venue -- rather than telling
 * them the same two times again.
 */

const neverChanges = () => () => {};

export function ViewerTimeNote({
  startsAt,
  endsAt,
  venueTimeZone,
}: {
  startsAt: string;
  endsAt: string;
  venueTimeZone: string;
}) {
  const zone = useSyncExternalStore(
    neverChanges,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    () => null,
  );

  if (!zone || zone === venueTimeZone) return null;

  const from = formatTime(startsAt, zone);
  const to = formatTime(endsAt, zone);
  // Different identifier, same clock -- Europe/Madrid against Europe/Paris.
  // Repeating identical times would be noise dressed as information.
  if (from === formatTime(startsAt, venueTimeZone)) return null;

  return (
    <span className="block text-xs text-faint">
      {from} – {to} your time · {formatZoneLabel(startsAt, zone)}
    </span>
  );
}
