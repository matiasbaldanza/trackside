import type { Day, Room } from "@/lib/sanity";
import { formatDayHeading } from "@/lib/schedule/format";
import { layOutDay } from "@/lib/schedule/layout";

import { SessionCard } from "./SessionCard";

/**
 * One day of the programme.
 *
 * There is a single list of sessions in the document, in chronological order,
 * and two layouts over it. On a wide screen it becomes a CSS grid with a
 * proportional time axis and one column per room; on a narrow one it stays a
 * list. No markup is duplicated and nothing is hidden from one layout to serve
 * the other -- see ADR-0005 for why that is worth the constraint it imposes.
 *
 * The grid lines and hour labels are a separate, `aria-hidden` layer behind
 * the list. They are the same information the times on each card already
 * carry, drawn so that a sighted reader can compare rooms at a glance; read
 * aloud they would be thirty numbers between every pair of sessions.
 *
 * The room headers are `aria-hidden` for the same reason, and that is the
 * cost this layout pays: a screen-reader user gets the room from each card
 * rather than from a column. `SessionCard` therefore keeps the room name in
 * the accessibility tree on every breakpoint, and hides it visually only
 * where a column header is doing the job.
 */
export function DaySchedule({
  day,
  rooms,
  timeZone,
  headingId,
}: {
  day: Day;
  rooms: readonly Room[];
  timeZone: string;
  headingId?: string;
}) {
  const layout = layOutDay(day.sessions, rooms, timeZone);
  const gridTemplateColumns = `3.75rem repeat(${rooms.length}, minmax(0, 1fr))`;
  const gridTemplateRows = `repeat(${layout.rowCount}, var(--spacing-row))`;

  if (day.sessions.length === 0) {
    return (
      <section aria-labelledby={headingId}>
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {formatDayHeading(day.date)}
        </h2>
        <p className="mt-3 rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nothing scheduled for this day yet.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold tracking-tight">
        {formatDayHeading(day.date)}
      </h2>

      <div
        aria-hidden="true"
        className="mt-3 hidden lg:grid"
        style={{ gridTemplateColumns }}
      >
        <div />
        {rooms.map((room) => (
          <div
            key={room.id}
            className="truncate border-b border-line px-3 pb-2 text-xs font-semibold tracking-wide text-muted uppercase"
          >
            {room.name}
          </div>
        ))}
      </div>

      {/* The overlay below is `inset-0`, so this element carries no padding of
          its own -- padding here would offset the hour rules from the cards
          they are meant to line up with. */}
      <div className="relative mt-3 lg:mt-2">
        {/* Time axis and hour rules. Decoration over information already
            present on every card. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:grid"
          style={{ gridTemplateColumns, gridTemplateRows }}
        >
          {layout.hours.map(({ hour, row }) => (
            <div
              key={`label-${hour}`}
              className="tabular self-start pr-3 text-right text-xs text-faint"
              style={{ gridRow: row, gridColumn: 1 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
          {layout.hours.map(({ hour, row }) => (
            <div
              key={`rule-${hour}`}
              className="h-0 self-start border-t border-line/40"
              style={{ gridRow: row, gridColumn: "2 / -1" }}
            />
          ))}
        </div>

        <ol
          className="relative flex flex-col gap-2 lg:grid lg:gap-x-2 lg:gap-y-0"
          style={{ gridTemplateColumns, gridTemplateRows }}
        >
          {day.sessions.map((session) => {
            const placement = layout.placements.get(session.id);
            return (
              <li
                key={session.id}
                className="lg:pb-0.5"
                style={
                  placement
                    ? {
                        gridRow: `${placement.row} / span ${placement.span}`,
                        gridColumn: placement.column,
                      }
                    : undefined
                }
              >
                <SessionCard session={session} timeZone={timeZone} />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
