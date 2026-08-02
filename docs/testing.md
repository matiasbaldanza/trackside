# Testing

> **Outline.** Filled in as tests are written. **No check is described here as passing unless it
> has actually been run**, and results are recorded as measured.

## What is worth testing here

_To be written._ The reasoning behind the split below: where bugs in this system would actually
come from, and which of those are worth catching automatically.

## Automated

### Unit — scheduling logic ✅
`sanity/lib/scheduling.test.ts` — 47 tests over overlap detection, end-time derivation, venue-date
conversion, day derivation and event bounds. These are pure functions precisely so they can be
tested without booting a Studio, which is what makes the validation rules verifiable at all.

The suite was checked against two deliberate mutations rather than assumed to be meaningful:
making intervals closed (so back-to-back sessions become conflicts) and dropping the millisecond
adjustment in the event-bounds check (so a session ending at midnight falls outside the
conference). Each was caught by exactly one test, naming the behaviour that broke.

### Unit — query result transformation ✅
`src/lib/sanity/programme.test.ts` — 30 tests over the boundary between Sanity's documents and the
model the interface renders.

This is where the `liveStatus` contract is proven. The schema hides fields by state rather than
clearing them, so a session marked delayed by twenty minutes and then set back to on time still
carries `delayMinutes: 20` in the document. Several tests exist only to check that such leftovers
are dropped, that a delay actually moves a start time while leaving the planned one intact, that a
moved session is placed in its new room and remembers the old one, and that a cancelled session
keeps the slot the printed programme gave it.

The rest cover what happens to content the type system says is impossible — an unrecognised
session type, a state the interface has no design for, a room reference that no longer resolves.
The Content Lake is schemaless, so those are reachable states rather than defensive padding.

### Unit — grid placement, filtering and formatting ✅
`src/lib/schedule/layout.test.ts` — 15 tests. The axis derived from the day's content, spans
proportional to duration, a moved session's column, a delayed session's row, clamping a session
that runs past midnight, and correct row alignment in a timezone whose offset is not a whole
number of hours.

`src/lib/schedule/filters.test.ts` — 15 tests. Which day opens by default, including the case
where it is already tomorrow in Europe and still today in Buenos Aires; unknown values falling
back rather than producing an empty page; and URLs keeping the parameters they were not asked to
change.

`src/lib/schedule/format.test.ts` — 15 tests. One instant in two zones, offsets on both sides of a
DST boundary, and what a status change says about the programme a reader is holding.

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
assert the implementation rather than the behaviour. Ticked items have been run and their results
are recorded below; unticked ones are planned for the milestone noted and have **not** been run.

- ✅ Studio validation as an editor experiences it — whether the message explains the conflict,
  and whether warnings stay out of the way. _Verified 2026-08-01, see below._
- ⬜ The live operations pane and the status action, on a phone. _Milestone 5._
- ⬜ Webhook delivery and cache invalidation end to end, against the deployed site. _Milestone 5._
- ⬜ A screen-reader pass over the timetable. _Milestone 6._
- ⬜ A real-handset pass on the mobile layout. _Milestone 6._ The agenda has been checked at a
  375px viewport, which is not the same thing: it says nothing about touch targets, about reading
  the schedule in daylight, or about the layout on a device with a notch.
- ⬜ The viewer-local time swap, from a machine outside the venue's timezone. _Milestone 6._

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

**2026-08-01 — Milestone 3**

| Check | Result |
| --- | --- |
| `pnpm seed` | 49 documents written |
| Seeded content readable **unauthenticated** | 1 event, 4 rooms, 18 speakers, 26 sessions, 0 drafts |
| Referential integrity over the API | No session missing a room; no broken speaker reference |
| `pnpm content:reset` dry run | Reported 50 documents including 1 draft; changed nothing |
| `pnpm content:reset -- --no-dry-run` | Deleted 50, wrote 49 |
| `pnpm content:export` | 50 documents archived; used before the reset, as the runbook requires |

**2026-08-02 — Milestone 4**

| Check | Result |
| --- | --- |
| `pnpm test` | 144 passed |
| `pnpm typecheck`, `pnpm lint` | Clean |
| `pnpm build` | Compiled; `/` dynamic, 26 session pages prerendered |
| Programme query over the public API, unauthenticated | 1 event, 4 rooms, 26 sessions |
| Timetable at 1440px | Four columns, axis aligned to the cards, spans proportional to duration |
| Agenda at 375px | Same sessions, chronological, room named on each card |
| Day switching, room filtering | Correct content; both reachable and shareable as URLs |
| Session detail | Speakers, times, room, abstract, workshop sign-up |
| Unknown slug | Renders the not-found page, title *Session not found* |

**Not verified in Milestone 4.** The viewer-local time swap was not observed in a browser: this
machine's timezone is the venue's, so the two renderings are identical. What that swap depends on
— formatting one instant in two zones, and offsets on both sides of a DST boundary — is covered by
`format.test.ts`. The hydration behaviour itself is React's `useSyncExternalStore` contract and is
not asserted here.

**Manual — Studio validation, verified 2026-08-01**

Moving *"Postgres hasta que duela"* from 10:45 to 11:30 in Auditorio Principal produced, inline
beneath the Room and Starts at fields:

> This room is already in use at that time by "Las revisiones de código se rompen a los quince".
> Two sessions cannot share a room.

The message names the colliding session, appears where the editor is working, and blocks
publishing. Speakers without a biography show a warning and do not block. That is the severity
split behaving as ADR-0003 describes it.

An earlier attempt attached the same rules at document level: they worked, but the editor saw only
*"There are validation errors that need to be fixed before this document can be published."* That
is why the rules moved onto their fields, and why this check is worth doing by hand — no automated
test distinguishes the two.
