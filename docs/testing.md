# Testing

> **Outline.** Filled in as tests are written. **No check is described here as passing unless it
> has actually been run**, and results are recorded as measured.

## What is worth testing here

_To be written._ The reasoning behind the split below: where bugs in this system would actually
come from, and which of those are worth catching automatically.

## Automated

### Unit — scheduling logic ✅
`sanity/lib/scheduling.test.ts` — 42 tests over overlap detection, end-time derivation, venue-date
conversion, day derivation and event bounds. These are pure functions precisely so they can be
tested without booting a Studio, which is what makes the validation rules verifiable at all.

The suite was checked against two deliberate mutations rather than assumed to be meaningful:
making intervals closed (so back-to-back sessions become conflicts) and dropping the millisecond
adjustment in the event-bounds check (so a session ending at midnight falls outside the
conference). Each was caught by exactly one test, naming the behaviour that broke.

### Unit — query result transformation
_Milestone 4._ Mapping query results into the view models the components consume.

### End to end
_Milestone 6._ One journey: open the schedule, change day, filter by room, switch to viewer-local
time, open a session.

### Accessibility
_Milestone 6._ Automated checks over the schedule and session detail routes, run alongside the
end-to-end journey.

### Continuous integration
_Milestone 7._ Type checking, linting, a production build, generated-artefact freshness, and the
test suites above.

## To be checked by hand

Some behaviour is not worth automating here, and pretending otherwise would produce tests that
assert the implementation rather than the behaviour. **None of the following has been run yet** —
each is planned for the milestone noted, and results are recorded below once they exist.

- ⬜ Studio validation as an editor experiences it — whether the message explains the conflict,
  and whether warnings stay out of the way. _Milestone 2, pending fixture content._
- ⬜ The live operations pane and the status action, on a phone. _Milestone 5._
- ⬜ Webhook delivery and cache invalidation end to end, against the deployed site. _Milestone 5._
- ⬜ A screen-reader pass over the timetable. _Milestone 6._
- ⬜ A real-handset pass on the mobile layout. _Milestone 6._

## Results

Only checks that actually ran appear here.

**2026-07-31 — Milestone 1**

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Clean |
| `pnpm lint` | Clean |
| `pnpm build` | Compiled; 3 static routes |
| `/` and `/studio` over HTTP | 200 |
| Studio boots in a browser | Renders, authenticates, reports empty schema, no console errors |
| Dataset readable without credentials | HTTP 200 unauthenticated |
| Studio dependencies absent from `/` | 7 scripts, 613 KB uncompressed, none containing Sanity code |

**2026-08-01 — Milestone 2**

| Check | Result |
| --- | --- |
| `pnpm test` | 42 passed |
| Mutation check: closed intervals | Caught by *treats back-to-back sessions as compatible* |
| Mutation check: dropped millisecond | Caught by *accepts a session ending exactly at midnight* |
| `pnpm typecheck`, `pnpm lint` | Clean |
| `pnpm schema:check` | Exit 0 on a clean tree; exit 1 when the schema changes without regeneration |
