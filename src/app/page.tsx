import type { Metadata } from "next";

import { DaySchedule } from "@/components/schedule/DaySchedule";
import { getProgramme } from "@/lib/sanity";
import { formatOffset } from "@/lib/schedule/format";

/**
 * The schedule is the site.
 *
 * There is no landing page in front of it. Everyone arriving here wants the
 * same thing -- what is on, where, and when -- and a page that delays that to
 * introduce the conference would be a page the audience has to get past.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { event } = await getProgramme();
  const where = [event.venueName, event.city].filter(Boolean).join(", ");
  return {
    title: `${event.name} — programme`,
    description: event.tagline ?? (where ? `The programme for ${event.name}, ${where}.` : undefined),
  };
}

export default async function SchedulePage() {
  const { event, rooms, days } = await getProgramme();
  const where = [event.venueName, event.city].filter(Boolean).join(", ");
  const offset = formatOffset(days[0] ? `${days[0].date}T12:00:00Z` : new Date(), event.timezone);

  return (
    <main className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{event.name}</h1>
        {event.tagline ? <p className="mt-1 text-muted">{event.tagline}</p> : null}
        <p className="mt-3 text-sm text-faint">
          {where ? `${where} · ` : ""}
          All times {offset}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-12">
        {days.map((day) => (
          <DaySchedule
            key={day.date}
            day={day}
            rooms={rooms}
            timeZone={event.timezone}
            headingId={`day-${day.date}`}
          />
        ))}
      </div>
    </main>
  );
}
