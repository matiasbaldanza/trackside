import Link from "next/link";

import type { ScheduledSession } from "@/lib/sanity";
import { changedFromInstant, changedFromRoom } from "@/lib/schedule/format";

import { Clock } from "./Clock";
import { StatusBadge } from "./StatusBadge";

/**
 * One session, in the schedule.
 *
 * The same component serves the desktop timetable and the mobile agenda,
 * because they are the same markup laid out differently -- see ADR-0005. What
 * differs is only what the surrounding layout already supplies: on desktop the
 * room is a column header, so the room name here is hidden visually while
 * staying in the accessibility tree; on mobile there are no columns, so it is
 * shown.
 *
 * Breaks and registration are not links. They have no abstract and no
 * speakers, so a detail page for them would be a title on an empty page, and
 * a link that leads nowhere useful is worse than no link -- particularly for
 * someone tabbing through a day of thirty slots.
 */
export function SessionCard({
  session,
  timeZone,
  viewerLocal,
}: {
  session: ScheduledSession;
  timeZone: string;
  viewerLocal: boolean;
}) {
  const isInterval = session.type === "break" || session.type === "registration";
  const isCancelled = session.status.state === "cancelled";
  const wasAt = changedFromInstant(session);
  const wasIn = changedFromRoom(session);

  const body = (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Clock
          instant={session.startsAt}
          timeZone={timeZone}
          viewerLocal={viewerLocal}
          className={`text-sm font-medium ${isCancelled ? "text-faint" : "text-muted"}`}
        />
        {wasAt ? (
          <span className="text-xs text-faint">
            (was{" "}
            <Clock instant={wasAt} timeZone={timeZone} viewerLocal={viewerLocal} />)
          </span>
        ) : null}
        {wasIn ? <span className="text-xs text-faint">(was {wasIn})</span> : null}
        <span className="text-xs text-faint lg:sr-only">· {session.room.name}</span>
      </div>

      <h3
        className={`mt-1 text-balance text-sm leading-snug font-medium ${
          isCancelled ? "text-muted line-through" : "text-text"
        }`}
      >
        {session.title}
      </h3>

      {session.speakers.length > 0 ? (
        <p className="mt-1 truncate text-xs text-muted">
          {session.speakers.map((speaker) => speaker.name).join(", ")}
        </p>
      ) : null}

      {session.status.state !== "onTime" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge session={session} />
          {session.status.note ? (
            <span className="text-xs text-muted">{session.status.note}</span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const shell = `flex h-full flex-col overflow-hidden rounded-md border p-3 transition-colors ${
    isInterval
      ? "border-dashed border-line bg-transparent"
      : "border-line bg-surface hover:border-line-strong hover:bg-surface-raised"
  }`;

  if (isInterval) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link href={`/sessions/${session.slug}`} className={`${shell} block`}>
      {body}
    </Link>
  );
}
