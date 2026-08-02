import Link from "next/link";

import type { Day, Room } from "@/lib/sanity";
import { formatDayLabel } from "@/lib/schedule/format";
import { scheduleHref, type ScheduleParams, type Selection } from "@/lib/schedule/filters";

/**
 * Choosing a day and a room.
 *
 * These are links, not buttons, and the distinction is not pedantry: each one
 * goes to a different URL that renders a different page, which is what a link
 * is. It also means the whole control works before any JavaScript loads, works
 * with the back button, and can be sent to somebody.
 *
 * They are deliberately not ARIA tabs. A tablist promises that the panels are
 * already present and that arrow keys move between them; here each choice is a
 * navigation, and announcing it as a tab would describe an interaction the page
 * does not have. `aria-current` says which one you are on, which is the fact
 * that actually needs conveying.
 */

/**
 * `inline-flex`, not the anchor's default `inline`.
 *
 * Vertical padding on an inline box does not contribute to layout height -- it
 * paints outside the line box without expanding it. Inside the horizontally
 * scrolling container below that produced twelve pixels of phantom vertical
 * overflow and, because `overflow-x: auto` forces a `visible` `overflow-y` to
 * compute to `auto`, a vertical scrollbar on every filter row.
 */
const BASE =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors";
const SELECTED = "border-accent bg-accent text-accent-ink font-medium";
const UNSELECTED = "border-line text-muted hover:border-line-strong hover:text-text";

function Choice({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`${BASE} ${selected ? SELECTED : UNSELECTED}`}
    >
      {children}
    </Link>
  );
}

export function ScheduleFilters({
  days,
  rooms,
  selection,
  params,
}: {
  days: readonly Day[];
  rooms: readonly Room[];
  selection: Selection;
  params: ScheduleParams;
}) {
  return (
    <div className="flex flex-col gap-3">
      {days.length > 1 ? (
        <nav
          aria-label="Conference days"
          className="-mx-4 -my-1 overflow-x-auto px-4 py-1 sm:-mx-1 sm:px-1"
        >
          <ul className="flex items-center gap-2">
            {days.map((day) => (
              <li key={day.date}>
                <Choice
                  href={scheduleHref(params, { day: day.date })}
                  selected={day.date === selection.day}
                >
                  {formatDayLabel(day.date)}
                </Choice>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {rooms.length > 1 ? (
        <nav aria-label="Rooms" className="-mx-4 -my-1 overflow-x-auto px-4 py-1 sm:-mx-1 sm:px-1">
          <ul className="flex items-center gap-2">
            <li>
              <Choice href={scheduleHref(params, { room: null })} selected={selection.room === null}>
                All rooms
              </Choice>
            </li>
            {rooms.map((room) => (
              <li key={room.id}>
                <Choice
                  href={scheduleHref(params, { room: room.slug })}
                  selected={room.slug === selection.room}
                >
                  {room.name}
                </Choice>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
