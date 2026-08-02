"use client";

import { useEffect } from "react";

/**
 * When the content cannot be fetched at all.
 *
 * Error boundaries must be Client Components -- they catch errors thrown
 * during rendering, which is a client-side concern even for a page rendered on
 * the server.
 *
 * The message says what is wrong and what the reader can do, and does not
 * apologise on behalf of a system they have no relationship with. `reset()`
 * re-renders the segment, which is a real remedy here: the usual cause is one
 * failed request to the content API, and the next one commonly succeeds.
 *
 * `error.message` is deliberately not shown. In production Next replaces it
 * with a digest anyway, and a raw message is either meaningless to a reader or
 * says more about the infrastructure than it should.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">The programme could not be loaded</h1>
      <p className="mt-3 text-muted">
        This is a problem at our end, not with your connection. Trying again often works.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-faint">Reference {error.digest}</p>
      ) : null}
      <p className="mt-6">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
        >
          Try again
        </button>
      </p>
    </main>
  );
}
