import Link from "next/link";

import { scheduleHref, type ScheduleParams } from "@/lib/schedule/filters";

import { LocalZoneLabel } from "./LocalTime";

/**
 * Whose clock the schedule is read on.
 *
 * A link, like the other filters, so the choice is in the URL and survives
 * being shared or reloaded. The preference is a query parameter rather than a
 * cookie or localStorage for the same reason: a link to "Friday, in my
 * timezone" should mean the same thing to whoever opens it, and a stored
 * preference silently rewrites a page someone else sent you.
 *
 * Venue time is the default and is stated as such. A conference schedule is
 * spoken in venue time all day -- signage, announcements, the person next to
 * you -- and a page that silently showed something else would put an attendee
 * out of step with the room they are standing in.
 *
 * The reader's own zone is offered because the other half of the audience is
 * not in the room, and telling them to do the arithmetic themselves is how
 * remote attendees miss the talk they got up for.
 */
export function TimezoneToggle({
  params,
  venueOffset,
  venueName,
  viewerLocal,
}: {
  params: ScheduleParams;
  /** Formatted as `UTC−3`. */
  venueOffset: string;
  /** The venue's timezone identifier, for the title attribute. */
  venueName: string;
  viewerLocal: boolean;
}) {
  const base = "rounded-full px-3 py-1 transition-colors";
  const on = "bg-surface-raised text-text font-medium";
  const off = "text-muted hover:text-text";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span id="timezone-label" className="text-faint">
        Times in
      </span>
      <div
        role="group"
        aria-labelledby="timezone-label"
        className="inline-flex rounded-full border border-line p-0.5"
      >
        <Link
          href={scheduleHref(params, { tz: null })}
          aria-current={viewerLocal ? undefined : "true"}
          title={venueName}
          className={`${base} ${viewerLocal ? off : on}`}
        >
          Venue time
        </Link>
        <Link
          href={scheduleHref(params, { tz: "local" })}
          aria-current={viewerLocal ? "true" : undefined}
          className={`${base} ${viewerLocal ? on : off}`}
        >
          My time
        </Link>
      </div>
      <span className="text-faint">
        {viewerLocal ? <LocalZoneLabel fallback={venueOffset} /> : venueOffset}
      </span>
    </div>
  );
}
