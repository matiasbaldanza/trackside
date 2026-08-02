import type { Metadata } from "next";

import { DaySchedule } from "@/components/schedule/DaySchedule";
import { ScheduleFilters } from "@/components/schedule/ScheduleFilters";
import { TimezoneToggle } from "@/components/schedule/TimezoneToggle";
import { getProgramme } from "@/lib/sanity";
import { filterDay, resolveSelection, visibleRooms, type ScheduleParams } from "@/lib/schedule/filters";
import { formatOffset } from "@/lib/schedule/format";

/**
 * The schedule is the site.
 *
 * There is no landing page in front of it. Everyone arriving here wants the
 * same thing -- what is on, where, and when -- and a page that delays that to
 * introduce the conference would be a page the audience has to get past.
 *
 * One day is rendered at a time. A two-day programme of twenty-six sessions
 * would fit on one page, but the grid's whole purpose is comparison across
 * rooms at a moment, and stacking days pushes the second one below a screen of
 * grid where nobody compares anything. The day is in the URL, so a link to
 * Friday is a link to Friday.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { event } = await getProgramme();
  const where = [event.venueName, event.city].filter(Boolean).join(", ");
  return {
    title: `${event.name} — programme`,
    description: event.tagline ?? (where ? `The programme for ${event.name}, ${where}.` : undefined),
  };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<ScheduleParams>;
}) {
  const params = await searchParams;
  const { event, rooms, days } = await getProgramme();

  const selection = resolveSelection(params, days, rooms, event.timezone);
  const day = days.find((candidate) => candidate.date === selection.day) ?? days[0];
  const where = [event.venueName, event.city].filter(Boolean).join(", ");
  // Midday on the selected day: far from either midnight, so the offset it
  // reports is the one in force for that day rather than one a DST
  // transition happens to straddle.
  const referenceInstant = `${selection.day}T12:00:00Z`;
  const offset = formatOffset(referenceInstant, event.timezone);

  return (
    <main className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{event.name}</h1>
          {event.tagline ? <p className="mt-1 text-muted">{event.tagline}</p> : null}
          {where ? <p className="mt-3 text-sm text-faint">{where}</p> : null}
        </div>
        <TimezoneToggle
          params={params}
          referenceInstant={referenceInstant}
          venueOffset={offset}
          venueName={event.timezone.replace(/_/g, " ")}
          viewerLocal={selection.viewerLocal}
        />
      </header>

      <div className="mt-6">
        <ScheduleFilters days={days} rooms={rooms} selection={selection} params={params} />
      </div>

      <div className="mt-8">
        {day ? (
          <DaySchedule
            day={filterDay(day, selection)}
            rooms={visibleRooms(rooms, selection)}
            timeZone={event.timezone}
            viewerLocal={selection.viewerLocal}
            headingId={`day-${day.date}`}
            emptyMessage={
              selection.room
                ? "Nothing in this room on this day. Try another room, or show them all."
                : "Nothing scheduled for this day yet."
            }
          />
        ) : (
          <p className="rounded-md border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
            The programme has not been announced yet.
          </p>
        )}
      </div>
    </main>
  );
}
