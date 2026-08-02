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
 * The rows wrap rather than scroll horizontally. A scrolling row is the right
 * shape for an open-ended list of tags, and the wrong one here: there are two
 * days and five room choices, all of which fit on a phone in two or three
 * lines. Scrolling would hide some of them behind an affordance nobody looks
 * for, and buy in exchange a scrollbar too thin to grab that sits against the
 * bottom edge of the pills.
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
 * paints outside the line box without expanding it, so each pill overflowed
 * its row by six pixels top and bottom.
 *
 * Both states are filled, and that is not decoration. Every pill is exactly
 * the same height, but a solid block reads as visibly larger than an outline
 * of identical size -- filled shapes carry more optical weight. Giving the
 * unselected state a surface of its own means the two differ in colour alone,
 * so the row reads as evenly sized because it *is* evenly sized.
 */
const BASE =
  "inline-flex items-center rounded-full border whitespace-nowrap transition-colors";

/**
 * Day and room are not peers, and the styling says so.
 *
 * Changing the day gives you a different programme; changing the room narrows
 * the one you are already looking at. The day always has a value and offers no
 * "all"; the room defaults to all and can be cleared. One is navigation, the
 * other is a filter, and they are used at completely different rates.
 *
 * What flattened them was the accent meaning two things in adjacent rows --
 * "the day you are on" and "the room you filtered to". Reserving the filled
 * accent for the day, and marking a selected room with an accent *edge* on a
 * raised surface, separates them without introducing any new vocabulary.
 */
const TONE = {
  primary: {
    size: "px-3.5 py-1.5 text-sm",
    selected: "border-accent bg-accent text-accent-ink font-medium",
    unselected:
      "border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-raised hover:text-text",
  },
  secondary: {
    size: "px-3 py-1 text-xs",
    selected: "border-accent bg-surface-raised text-text font-medium",
    unselected:
      "border-line bg-transparent text-muted hover:border-line-strong hover:text-text",
  },
} as const;

/** A small marginal label, so a sighted reader gets what the aria-label says. */
function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="w-10 shrink-0 text-xs tracking-wide text-faint uppercase">
      {children}
    </span>
  );
}

function Choice({
  href,
  selected,
  tone,
  children,
}: {
  href: string;
  selected: boolean;
  tone: keyof typeof TONE;
  children: React.ReactNode;
}) {
  const style = TONE[tone];
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`${BASE} ${style.size} ${selected ? style.selected : style.unselected}`}
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
    <div className="flex flex-col gap-2.5">
      {days.length > 1 ? (
        <nav aria-label="Conference days" className="flex items-baseline gap-3">
          <RowLabel>Day</RowLabel>
          <ul className="flex flex-wrap items-center gap-2">
            {days.map((day) => (
              <li key={day.date}>
                <Choice
                  href={scheduleHref(params, { day: day.date })}
                  selected={day.date === selection.day}
                  tone="primary"
                >
                  {formatDayLabel(day.date)}
                </Choice>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {rooms.length > 1 ? (
        <nav aria-label="Rooms" className="flex items-baseline gap-3">
          <RowLabel>Room</RowLabel>
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <Choice
                href={scheduleHref(params, { room: null })}
                selected={selection.room === null}
                tone="secondary"
              >
                All rooms
              </Choice>
            </li>
            {rooms.map((room) => (
              <li key={room.id}>
                <Choice
                  href={scheduleHref(params, { room: room.slug })}
                  selected={room.slug === selection.room}
                  tone="secondary"
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
