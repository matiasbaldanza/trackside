import Link from "next/link";

/**
 * A session that has been renamed, withdrawn, or mistyped.
 *
 * Slugs are shared before an event and can change after; the field
 * description in the schema warns editors of exactly this. What matters here
 * is that the reader is one click from the thing they were probably looking
 * for, rather than at a dead end telling them a slug did not resolve.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">This page is not in the programme</h1>
      <p className="mt-3 text-muted">
        The session may have been renamed or withdrawn since this link was shared.
      </p>
      <p className="mt-6">
        <Link
          href="/"
          className="inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
        >
          See the full programme
        </Link>
      </p>
    </main>
  );
}
