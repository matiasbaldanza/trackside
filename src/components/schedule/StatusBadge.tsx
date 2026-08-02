import type { LiveState, ScheduledSession } from "@/lib/sanity";
import { formatStatus } from "@/lib/schedule/format";

/**
 * What has changed about a session, in words.
 *
 * Colour is never the signal. Each badge states its status in text, and the
 * colour only makes it findable in a field of thirty cards -- so the schedule
 * reads identically to someone who cannot distinguish amber from red, and to
 * anyone reading it on a projector or in sunlight.
 *
 * Nothing renders for a session running as planned. Twenty-six "on time"
 * badges make the two that matter harder to find.
 */

const TONE: Record<Exclude<LiveState, "onTime">, string> = {
  delayed: "border-delayed/45 text-delayed",
  moved: "border-moved/45 text-moved",
  cancelled: "border-cancelled/45 text-cancelled",
};

export function StatusBadge({ session }: { session: ScheduledSession }) {
  const label = formatStatus(session);
  const { state } = session.status;
  if (!label || state === "onTime") return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[state]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
