import Link from "next/link";

import { scheduleHref, type ScheduleParams } from "@/lib/schedule/filters";

import { LocalOffset, LocalZoneName } from "./LocalTime";

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
 *
 * ## Why this is two lines
 *
 * The control and the offset sit on one line; the zone's name sits on the
 * next. That is a layout decision, and it is load-bearing.
 *
 * An offset is five characters in almost every zone, and `tabular-nums` makes
 * `UTC−3` and `UTC+2` the same width to the pixel, so a slot of reserved width
 * holds it without the control ever moving. A zone identifier is not
 * predictable at all -- `UTC` to `America/Argentina/Buenos_Aires` -- and while
 * it sat inline the control jumped 159 pixels: once when the reader toggled,
 * and again, unprompted, when the client swapped its guess in after
 * hydration. On its own line, with nothing beside it, its width is nobody's
 * business.
 *
 * A tooltip would also have removed the shift, and was rejected: `title` is
 * unreachable by keyboard and by touch, and "has it guessed my zone right?" is
 * precisely the question a reader on a phone needs answered.
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
    <div className="flex flex-col gap-1 lg:items-end">
      <div className="flex items-center gap-2 text-sm">
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
        {/* Reserved width, tabular figures. Wide enough for the longest real
            offset (`UTC−09:30`), so nothing to its left can be moved by what
            lands in it -- neither a toggle nor a hydration swap. */}
        <span className="tabular inline-block w-[4.75rem] shrink-0 text-faint">
          {viewerLocal ? <LocalOffset fallback={venueOffset} /> : venueOffset}
        </span>
      </div>
      <p className="text-xs text-faint">
        {viewerLocal ? <LocalZoneName fallback={venueName} /> : venueName}
      </p>
    </div>
  );
}
