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
 * The control has its own line and nothing follows it; the offset and the zone
 * name go on the next. That is a layout decision, and it is load-bearing.
 *
 * While the label sat beside the control, the control jumped 159 pixels --
 * once when the reader toggled, and again, unprompted, when the client swapped
 * its own zone in after hydration. Nothing that changes width may sit next to
 * a control whose position should be stable, and every part of this label
 * changes width: the offset between `UTC−3` and `UTC−09:30`, the identifier
 * between `UTC` and `America/Argentina/Buenos_Aires`.
 *
 * Reserving a fixed slot for the offset was tried first and removed. It held
 * the position, but a slot sized for the widest case is mostly empty in the
 * common one, so the control floated short of the right edge and read as
 * unbalanced. Moving the whole label down solves the shift and the alignment
 * at once: the control ends its line, so it sits flush right, and the label
 * below can be any width because nothing is beside it.
 *
 * A tooltip would also have removed the shift, and was rejected: `title` is
 * unreachable by keyboard and by touch, and "has it guessed my zone right?" is
 * precisely the question a reader on a phone needs answered.
 */
export function TimezoneToggle({
  params,
  referenceInstant,
  venueOffset,
  venueName,
  viewerLocal,
}: {
  params: ScheduleParams;
  /**
   * The instant both offsets are quoted at -- the day being displayed, not now.
   *
   * An offset is a property of a zone *at a moment*, so the two halves of this
   * label have to be quoted at the same one. The venue's is already computed
   * against the selected day; computing the reader's against `new Date()`
   * would mean a reader in Santiago browsing in July sees UTC−4 printed beside
   * September times that are actually UTC−3. The label would contradict the
   * schedule underneath it, and only for part of the year.
   */
  referenceInstant: string;
  /** Formatted as `UTC−3`, at `referenceInstant`. */
  venueOffset: string;
  /** The venue's timezone identifier. */
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
      </div>
      <p className="tabular text-xs text-faint">
        {viewerLocal ? (
          <>
            <LocalOffset instant={referenceInstant} fallback={venueOffset} /> · <LocalZoneName fallback={venueName} />
          </>
        ) : (
          `${venueOffset} · ${venueName}`
        )}
      </p>
    </div>
  );
}
