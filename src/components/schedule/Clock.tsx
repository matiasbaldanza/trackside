import { formatTime } from "@/lib/schedule/format";

import { LocalTime } from "./LocalTime";

/**
 * A time on the schedule, in whichever zone the reader asked for.
 *
 * Server-rendered in venue time by default. Only when the reader has chosen
 * their own timezone does this become a client island -- so the default
 * schedule ships no JavaScript for times at all, and the interactive version
 * costs one small component per time rather than a client boundary around the
 * grid.
 */
export function Clock({
  instant,
  timeZone,
  viewerLocal,
  className,
}: {
  instant: string;
  timeZone: string;
  viewerLocal: boolean;
  className?: string;
}) {
  const venue = formatTime(instant, timeZone);

  if (!viewerLocal) {
    return (
      <time dateTime={instant} className={className}>
        {venue}
      </time>
    );
  }

  return <LocalTime instant={instant} fallback={venue} className={className} />;
}
