# ADR-0007: Scope the loading skeleton with a route group, so unknown sessions return a true 404

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

`/sessions/<unknown-slug>` returned HTTP **200** carrying the not-found page, rather than 404.
Found on the first deployment (runbook §9.7). A genuinely unrouted path such as
`/nonsense-path` returned 404 correctly, so the fault was specific to the `[slug]` route.

The route is written exactly as Next.js documents the pattern: `generateStaticParams` prerenders
the known sessions, `dynamicParams` is left at its default `true` so a session published after the
build renders on first request, and the page calls `notFound()` when `getSession(slug)` returns
`null`. The ISR guide bundled with Next 16.2 states plainly that with `dynamicParams = true`, "if
the post does not exist, then 404 is returned." Ours did not.

The cause is documented in the same bundled docs, under `loading.md` → Status Codes:

> When streaming, a `200` status code will be returned... Because the response headers have
> already been sent to the client, the status code of the response cannot be updated... The
> response body starts streaming when a Suspense fallback renders (for example, a `loading.tsx`).

`src/app/loading.tsx` sat at the application root, which places a Suspense boundary around **every**
route beneath it — including `/sessions/[slug]`. On a request for an unknown slug, Next began
streaming that loading fallback, flushing `200` response headers, *before* `getSession()` resolved
and `notFound()` was thrown. Once the headers were sent the status was locked, so `notFound()`
rendered the not-found UI into an already-`200` response — a soft 404.

This was confirmed rather than assumed. The status was reproduced at the origin under `next start`
(so it was not a Vercel CDN artefact), and moving `src/app/loading.tsx` out of the tree turned the
unknown slug into a hard 404 while leaving the real slug at 200.

**One belief this corrected.** Runbook §9.7 recorded the soft 404 as indexable by search engines.
It is not: Next injects `<meta name="robots" content="noindex">` into a not-found response that is
streamed, and the docs are explicit that "this does not lead to indexation." The residual concern
is therefore narrower than first recorded — HTTP-status correctness for uptime monitoring,
analytics and compliance, not SEO.

## Decision

The loading skeleton is scoped to the schedule route with a route group. The home route and its
loading file move into `src/app/(schedule)/`:

```
src/app/page.tsx    → src/app/(schedule)/page.tsx
src/app/loading.tsx → src/app/(schedule)/loading.tsx
```

`layout.tsx`, `not-found.tsx` and `error.tsx` stay at the application root, where they remain
global. Route groups do not affect the URL, so `/` is unchanged.

The loading boundary now wraps only the schedule. `/sessions/[slug]` has no ancestor Suspense
boundary, so `notFound()` is thrown before any response body streams and Next sets a true 404.
`dynamicParams` stays `true`, so a session published after the build still renders on demand.

## Alternatives considered

**`dynamicParams = false`.** Unknown slugs would 404 at the router, before any rendering.
*For:* one line, and the most direct reading of "make unknown slugs 404". *Against:* it also makes
any session **not** in the build-time `generateStaticParams` set unreachable until a redeploy. This
is a run-of-show system whose premise is that the programme changes during an event; a session
added on the day would return 404 to everyone until the next deploy. The fix would trade a wrong
status for a wrong absence.

**A `proxy` (middleware) existence check.** The `loading.md` note suggests rewriting missing slugs
to a not-found route in `proxy`, so the status is set before streaming.
*For:* keeps the status decision entirely ahead of rendering. *Against:* it puts a Sanity query in
middleware, which the docs themselves caution to keep fast, and which would place content access
outside `src/lib/sanity/` — against Architecture rule 1. It solves a rendering-order problem with a
network call on every session request.

**Accept the soft 404, correct only the documentation.** Since the `noindex` meta prevents
indexation, treat the noindex'd soft 404 as acceptable framework behaviour.
*For:* no code change; the largest concern (SEO) is already handled. *Against:* uptime monitoring
and analytics still read 200 for a missing resource, and "the resource is missing" is exactly the
thing an HTTP status exists to state. A schedule whose links are shared widely will have monitors
and referrers hitting dead slugs; they should see 404.

## Consequences

- `/sessions/<unknown-slug>` returns 404 at the origin, verified under `next start`: the unknown
  slug 404s on first and subsequent hits, the real slug stays 200, `/` stays 200, and a truly
  unrouted path stays 404.
- The not-found page still renders with its `noindex` meta, so indexation stays prevented as well
  as it was before.
- `/` keeps its zero-CLS loading skeleton — the boundary was scoped, not removed.
- Session pages no longer have a loading fallback. They are prerendered and served from cache, so
  there is nothing to stream a fallback for; an on-demand render of a newly published session waits
  briefly with no skeleton, which is a rare path and an acceptable one.
- The home route now lives in a `(schedule)` group, which is the "why is this here?" cost — a
  reader has to know that the group exists to hold a loading boundary away from sibling routes.
  This record is that explanation.

## Revisiting

If session pages later gain slow, uncached work that warrants their own loading state, add a
`loading.tsx` inside `src/app/sessions/` — but then the 404 status must be re-solved, because the
boundary that caused this would be back. The `proxy` approach, or resolving existence before the
first `await` that can suspend, becomes the tool at that point.
