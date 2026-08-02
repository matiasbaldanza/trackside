"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Back to the schedule, on the day this session is on.
 *
 * A client component for one reason: it carries the reader's timezone choice
 * back with it. Someone who set the schedule to their own time, opened a
 * session and returned should not find it reset to venue time.
 *
 * `useSearchParams` is the only thing on this page that needs the request, so
 * it is isolated here behind a Suspense boundary rather than read on the
 * server -- which would make every session page render per request for the
 * sake of one query parameter on one link. The Suspense fallback is the same
 * link without the parameter, so the page is never missing its way back.
 */
export function BackToProgramme({ day }: { day: string }) {
  const viewerLocal = useSearchParams().get("tz") === "local";
  return <BackLink href={viewerLocal ? `/?day=${day}&tz=local` : `/?day=${day}`} />;
}

export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm text-muted hover:text-text">
      ← Back to the programme
    </Link>
  );
}
