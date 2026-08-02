"use client";

import { useSyncExternalStore } from "react";

import { formatTime, formatZoneLabel } from "@/lib/schedule/format";

/**
 * A time shown in the reader's own timezone.
 *
 * The browser's timezone is unknowable on the server -- it is not in any
 * request header -- so this is one of the two things on the schedule that
 * genuinely cannot be a Server Component.
 *
 * It renders the venue time first, exactly as the server sent it, and swaps
 * after hydration. That ordering is deliberate:
 *
 *  - **No hydration mismatch.** React uses the server snapshot for the
 *    hydrating render and only then re-reads the client one, so the first
 *    client render is byte-identical to the HTML. Formatting the local time
 *    during render instead would produce different text on each side, and
 *    React would either warn or silently keep whichever it saw first.
 *  - **No layout shift.** Both strings are 24-hour and zero-padded, so both are
 *    five characters, and `font-variant-numeric: tabular-nums` in the global
 *    stylesheet makes those five characters the same width whatever the digits
 *    are. The swap changes the text and moves nothing.
 *  - **Readable without JavaScript.** Someone whose bundle never arrives sees
 *    venue time, correctly labelled as venue time, rather than an empty
 *    element.
 *
 * `useSyncExternalStore` rather than state set from an effect. The reader's
 * timezone is an external value that the server and the client disagree about,
 * which is the case this hook exists for -- and it expresses "the server says
 * X, the browser says Y" directly, instead of as a render followed by a
 * correction.
 */

/** The zone never changes within a page view, so nothing needs to be notified. */
const neverChanges = () => () => {};

function viewerTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function LocalTime({
  instant,
  fallback,
  className,
}: {
  instant: string;
  fallback: string;
  className?: string;
}) {
  const label = useSyncExternalStore(
    neverChanges,
    () => {
      const zone = viewerTimeZone();
      return zone ? formatTime(instant, zone) : fallback;
    },
    () => fallback,
  );

  return (
    <time dateTime={instant} className={className}>
      {label}
    </time>
  );
}

/**
 * The reader's timezone, named, so the times above are not just numbers.
 *
 * Falls back to the venue's label until it knows better, for the same reason
 * as above: what the server can say truthfully is what the server says.
 */
export function LocalZoneLabel({ fallback }: { fallback: string }) {
  const label = useSyncExternalStore(
    neverChanges,
    () => {
      const zone = viewerTimeZone();
      return zone ? formatZoneLabel(new Date(), zone) : fallback;
    },
    () => fallback,
  );

  return <span>{label}</span>;
}
