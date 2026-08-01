/**
 * Scheduling arithmetic, as pure functions.
 *
 * Nothing here touches Sanity, the network, or the clock. That is deliberate
 * and it is the reason this module exists separately from the schema: the
 * rules that decide whether a programme is valid are the rules most worth
 * testing, and testing them should not require booting a Studio.
 *
 * The schema imports these. So do the tests. There is no second copy.
 */

/** A session reduced to the fields scheduling arithmetic actually needs. */
export interface Scheduled {
  startsAt: string;
  durationMinutes: number;
}

/**
 * The instant a session ends.
 *
 * End times are derived, never stored: two stored fields can disagree, and
 * the one that disagrees silently is always the one nobody edits. See
 * ADR-0002.
 */
export function endsAt(session: Scheduled): Date {
  return new Date(new Date(session.startsAt).getTime() + session.durationMinutes * 60_000);
}

/** Minutes as `1h 30m`, `45 min`, or `2h`. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** How a live status reads in a compact space. Empty when nothing is wrong. */
export function formatStatusBadge(state?: string, delayMinutes?: number): string {
  switch (state) {
    case "delayed":
      return delayMinutes ? `Delayed +${delayMinutes}m` : "Delayed";
    case "moved":
      return "Moved";
    case "cancelled":
      return "Cancelled";
    default:
      return "";
  }
}

export interface SessionPreviewInput {
  title?: string;
  type?: string;
  startsAt?: string;
  durationMinutes?: number;
  trackName?: string;
  state?: string;
  delayMinutes?: number;
}

/**
 * The subtitle shown against a session in the Studio's document lists.
 *
 * Reads as `Sat 10:30 · Main Hall · 40 min · Delayed +15m`, so that a list of
 * thirty sessions can be scanned as a schedule rather than as a list of
 * titles. During an event this list is the thing an operator is looking at,
 * and a column of identical-looking rows is useless to them.
 *
 * Times render in the viewer's own timezone, not the venue's: the Studio has
 * no access to the event document from a preview, and inventing a second
 * source for the venue timezone to work around that would be worse than the
 * ambiguity. The field description on `startsAt` says so plainly.
 */
export function formatSessionPreview(input: SessionPreviewInput): {
  title: string;
  subtitle?: string;
} {
  const { title, type, startsAt, durationMinutes, trackName, state, delayMinutes } = input;

  const when = startsAt
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(startsAt))
    : "Unscheduled";

  const parts = [
    when,
    trackName,
    durationMinutes ? formatDuration(durationMinutes) : undefined,
    formatStatusBadge(state, delayMinutes) || undefined,
  ].filter(Boolean);

  const isInterval = type === "break" || type === "registration";

  return {
    title: title || (isInterval ? "Untitled interval" : "Untitled session"),
    subtitle: parts.join(" · ") || undefined,
  };
}
