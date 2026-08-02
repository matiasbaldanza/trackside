import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink, BackToProgramme } from "@/components/schedule/BackToProgramme";
import { StatusBadge } from "@/components/schedule/StatusBadge";
import { ViewerTimeNote } from "@/components/schedule/ViewerTimeNote";
import { getSession, getSessionSlugs } from "@/lib/sanity";
import {
  changedFromInstant,
  changedFromRoom,
  formatDayHeading,
  formatLanguage,
  formatLevel,
  formatDuration,
  formatOffset,
  formatTime,
  formatType,
  venueDate,
} from "@/lib/schedule/format";

/**
 * One session, in full.
 *
 * The schedule is a grid of forty-word cards; this is where the abstract, the
 * speakers' affiliations and the practical detail live. It is also the URL
 * that gets shared -- from a phone, in a corridor, to someone deciding whether
 * to walk over -- so the top of the page answers where and when before it
 * answers what.
 *
 * Unlike the schedule, this page does not make the reader choose a timezone.
 * It has room for both, so it shows venue time as the heading and the reader's
 * own underneath -- which is also what keeps it statically renderable.
 */

/**
 * Pre-rendered at build time, one page per published session.
 *
 * The set is small and changes over weeks. Sessions added later still work --
 * they are rendered on first request and cached -- so this is a head start,
 * not a constraint.
 */
export async function generateStaticParams() {
  const slugs = await getSessionSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSession(slug);
  if (!page) return { title: "Session not found" };

  const { session } = page;
  const speakers = session.speakers.map((speaker) => speaker.name).join(", ");
  return {
    title: session.title,
    description: session.abstract ?? (speakers ? `${session.title}, with ${speakers}.` : undefined),
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-faint uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export default async function SessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getSession(slug);
  if (!page) notFound();

  const { session, event } = page;
  const day = venueDate(session.startsAt, event.timezone);
  const wasAt = changedFromInstant(session);
  const wasIn = changedFromRoom(session);
  const language = formatLanguage(session.language);
  const level = formatLevel(session.level);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Suspense fallback={<BackLink href={`/?day=${day}`} />}>
        <BackToProgramme day={day} />
      </Suspense>

      <header className="mt-6">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          {formatType(session.type)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">{session.title}</h1>

        {session.speakers.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-1">
            {session.speakers.map((speaker) => (
              <li key={speaker.id} className="text-sm">
                <span className="font-medium">{speaker.name}</span>
                {speaker.jobTitle || speaker.organisation ? (
                  <span className="text-muted">
                    {" — "}
                    {[speaker.jobTitle, speaker.organisation].filter(Boolean).join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {session.status.state !== "onTime" ? (
        <div className="mt-6 rounded-md border border-line bg-surface p-4">
          <StatusBadge session={session} />
          {session.status.note ? (
            <p className="mt-2 text-sm text-muted">{session.status.note}</p>
          ) : null}
        </div>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4">
        <Fact label="Day">{formatDayHeading(day)}</Fact>
        <Fact label="Time">
          <time dateTime={session.startsAt}>{formatTime(session.startsAt, event.timezone)}</time>
          {" – "}
          <time dateTime={session.endsAt}>{formatTime(session.endsAt, event.timezone)}</time>
          {wasAt ? (
            <span className="text-faint">
              {" (was "}
              <time dateTime={wasAt}>{formatTime(wasAt, event.timezone)}</time>)
            </span>
          ) : null}
          <span className="block text-xs text-faint">
            {formatOffset(session.startsAt, event.timezone)} · venue time
          </span>
          <ViewerTimeNote
            startsAt={session.startsAt}
            endsAt={session.endsAt}
            venueTimeZone={event.timezone}
          />
        </Fact>
        <Fact label="Room">
          {session.room.name}
          {wasIn ? <span className="text-faint"> (was {wasIn})</span> : null}
        </Fact>
        <Fact label="Length">{formatDuration(session.durationMinutes)}</Fact>
      </dl>

      {session.abstract ? (
        <div className="mt-6 max-w-prose">
          {session.abstract.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index} className="mt-4 leading-relaxed first:mt-0">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">
          No description has been published for this session yet.
        </p>
      )}

      {(language || level || session.recorded || session.captioned) ? (
        <ul className="mt-6 flex flex-wrap gap-2 text-xs text-muted">
          {language ? <li className="rounded-full border border-line px-2 py-1">{language}</li> : null}
          {level ? <li className="rounded-full border border-line px-2 py-1">{level}</li> : null}
          {session.recorded ? (
            <li className="rounded-full border border-line px-2 py-1">Recorded</li>
          ) : null}
          {/* Stated only when true. Someone who depends on captions plans their
              day around this, and "we did not say" must not read as "yes". */}
          {session.captioned ? (
            <li className="rounded-full border border-line px-2 py-1">Live captioned</li>
          ) : null}
        </ul>
      ) : null}

      {session.type === "workshop" && session.signupUrl ? (
        <div className="mt-8 rounded-md border border-line bg-surface p-4">
          <p className="text-sm">
            {session.capacity
              ? `Places are limited to ${session.capacity}.`
              : "Places are limited."}
          </p>
          <a
            href={session.signupUrl}
            className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
            rel="noreferrer"
          >
            Reserve a place
          </a>
        </div>
      ) : null}
    </main>
  );
}
