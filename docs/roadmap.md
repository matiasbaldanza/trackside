# Roadmap

A living document. Milestones are updated as they complete; the record of what was planned and what
actually happened stays visible rather than being rewritten.

**Legend:** ⬜ not started · 🟨 in progress · ✅ complete

---

## Milestone 1 — Foundation ✅

**Outcome:** The repository stands up: instructions, decision records, roadmap, and a Next.js
application with Sanity Studio embedded and reachable.

**User-visible result:** None yet. `pnpm dev` serves an empty application and a working Studio.

**Technical tasks**
- [x] Initialise the repository and the Next.js application (TypeScript, App Router, Tailwind 4).
- [x] `AGENTS.md`, `CLAUDE.md` pointing at it, and the `docs/` skeleton.
- [x] ADR template, index, and ADR-0001.
- [x] Install and configure Sanity; mount the Studio at `/studio`.
- [x] Validate environment variables in one module.
- [x] Provision the Sanity project; verify the dataset reads without credentials.

**Validation:** `pnpm typecheck` and `pnpm lint` clean. `/` and `/studio` both return 200. The
Studio boots in a browser, authenticates, and reports an empty schema.

**Documentation:** `AGENTS.md`, `README.md`, `docs/roadmap.md`, ADR-0001, runbook sections 1–3
(verified).

**Exit criteria:** ✅ A contributor can clone the repository, run one command, and reach both the
application and the Studio.

**What was learned:** Importing `sanity.config.ts` from a Server Component breaks the build under
Next 16 — the `react-server` export condition resolves `swr` to a build without the default export
Sanity imports. The Studio needs an explicit client boundary. Recorded in `docs/architecture.md`.

---

## Milestone 2 — Content model ✅

**Outcome:** The conference programme is modelled, with validation that prevents a schedule from
becoming structurally impossible.

**User-visible result:** An editor can build a complete programme in the Studio and is stopped when
they create a conflict.

**Technical tasks**
- Documents: `event` (singleton), `track`, `speaker`, `session`. Objects: `liveStatus`, `link`,
  `seo`.
- Scheduling logic as pure functions, shared by the schema and the tests.
- Blocking validation: sessions within the event's dates; no two sessions overlapping in one
  track; type-conditional required fields; unique slugs.
- Advisory validation: a speaker double-booked across overlapping sessions; missing biography or
  portrait; abstract length.
- Studio previews that read as schedule entries rather than document titles.

**Validation:** Unit tests over the scheduling functions. Manual confirmation that a conflicting
session is rejected with a message naming the conflict.

**Documentation:** ADRs on the time representation and on the validation severity split.

**Exit criteria:** ✅ An editor attempting to double-book a room is blocked and told which session
they collided with — verified in the Studio against real content on 2026-08-01.

**What was learned:** rules attached at document level surface only in a validation panel, reduced
to a generic sentence at the Publish button. Attaching each rule to the field it concerns is what
makes a carefully worded message actually reach an editor.

**Commit boundaries:** `feat(sanity): add conference content model` · `feat(sanity): add scheduling
validation` · `test: cover scheduling logic`

---

## Milestone 3 — Fixture content ✅

**Outcome:** A complete, realistic programme for Nodo Conf that can be loaded into any dataset from
empty.

**User-visible result:** The Studio contains a two-day programme worth reading.

**Technical tasks**
- Fixture set: one event, four rooms, ~28 speakers, ~24 sessions across two days, including
  breaks and workshops.
- An idempotent seed script.
- Export and restore scripts.

**Validation:** Seeding an empty dataset produces a programme that passes its own validation rules.

**Documentation:** `docs/local-development.md`; the seeding and backup sections of
`docs/runbook.md`.

**Exit criteria:** ✅ `pnpm seed` populates a dataset with content that validates — verified over
the public API as an anonymous reader, not only in the authenticated Studio.

**What was learned:** a document whose `_id` contains a dot is private regardless of dataset
visibility, so the first seeded programme was invisible to everyone except authenticated users
while reporting complete success. Sanity also stores datetimes exactly as written rather than
normalising them, which would have made every range query unreliable. Both are now covered by
tests over the fixture data.

**Commit boundaries:** `feat: add nodo conf fixture content` · `chore: add seed and export scripts`

---

## Milestone 4 — The public schedule ✅

**Outcome:** The attendee-facing product works end to end.

**User-visible result:** A visitor can open the site on a phone and answer "what is on now, and
what time is that for me?"

**Technical tasks**
- [x] Typed query layer and the single fetching helper that expresses caching policy.
- [x] Desktop timetable: a time axis with one column per room.
- [x] Mobile: a chronological agenda, a different layout rather than a compressed grid.
- [x] Day and room filtering through `searchParams`, driven by links.
- [x] Timezone handling: venue time rendered on the server, viewer-local offered as a toggle.
- [x] Session detail route.
- [x] Loading, empty, and error states.

**Validation:** 78 unit tests over the query transformation, grid placement, filter resolution and
formatting. Both layouts, both days, room filtering, the detail route and the not-found page
checked in a browser against the seeded programme at 1440px and 375px.

**Not verified:** the local-time swap was not observed in a browser, because this machine's
timezone is the venue's. The formatting it depends on is tested against two zones and both sides
of a DST boundary; the hydration contract is React's. A pass on a real handset is still
outstanding.

**On the visual treatment.** It is deliberately plain, and that is a sequencing decision rather
than the intended result. Choosing a component library and an art direction are decisions with
their own trade-offs, and taking them at the same time as the layout, the timezone handling and
the caching boundary would have meant arguing four things at once and getting none of them
cleanly. So this milestone establishes the structure under a neutral skin; the visual identity is
a separate pass over surfaces that are already settled.

**Documentation:** `docs/architecture.md` — data access, rendering boundaries, timezones.
ADR-0005 and ADR-0006.

**Exit criteria:** ✅ The schedule is correct, shareable by URL, and usable on a phone.

**What was learned:** the mobile agenda did not need a separate commit or a separate component
tree. Ordering the document chronologically and placing items on a grid with `grid-row` and
`grid-column` produces both layouts from one list — and produces a *better* reading order than the
per-track lists originally planned, because the chronological order is the one an attendee thinks
in. That changed the plan mid-milestone and is recorded in ADR-0005.

Reading `searchParams` in the session route to carry the timezone preference silently cost static
rendering of all 26 pages. Showing venue time and the reader's time together — which a detail page
has room for and a grid does not — was both simpler and better.

**Commit boundaries:** `feat(sanity): add the typed query layer` · `feat(schedule): render the
timetable` · `feat(schedule): filter by day and room` · `feat(schedule): offer viewer-local times,
and mark the current moment` · `feat: add the session detail route, and the loading and error
states`

*Planned as six commits; the mobile agenda is not among them because it turned out not to be
separate work. See ADR-0005.*

---

## Deployment — pulled forward from Milestone 7 ✅

**Done 2026-08-02, out of sequence and deliberately.**

Milestone 7 still owns continuous integration, the environment matrix per environment, and the
clean-clone reproduction. What moved earlier is only the first deployment, for two reasons.

Every milestone from 4 onward keeps a frozen preview branch so milestones can be compared side by
side. That only works if the deployment exists *before* the next milestone changes what it would
show — the Milestone 4 scaffold cannot be captured after Milestone 4.5 has restyled it.

And deploying is where the environment assumptions get tested. Doing it while the application is
small meant the pnpm, Node and CORS questions were answered against four routes rather than
against a finished system.

**Verified:** production deployed and reachable, the schedule rendering real content, `/studio`
authenticating, filters applying. `docs/runbook.md` §9 written from the run; `docs/deployments.md`
records the URLs.

**What was learned:** the `ERR_PNPM_IGNORED_BUILDS` failure anticipated for `sharp`, `esbuild` and
`unrs-resolver` did not occur — `pnpm-workspace.yaml`'s `allowBuilds` carried over untouched. The
deployment that Vercel starts on import, before environment variables exist, is expected to fail
and is harmless.

It also surfaced a defect no local check had: `/sessions/<unknown-slug>` returns HTTP 200 with the
not-found page instead of 404. A soft 404 is indexable and invisible to monitoring. Recorded in
runbook §9.7 rather than reflexively fixed, because the obvious remedy would make sessions
published after a build unreachable until the next one.

---

## Milestone 5 — Live operations ⬜

**Outcome:** The operator loop closes. A change made on a phone in a hallway reaches the public
schedule within seconds.

**User-visible result:** Delayed, moved, and cancelled sessions are marked as such for attendees.

**Technical tasks**
- `liveStatus` on sessions, and a content migration backfilling existing documents.
- A Studio pane scoped to the current day, ordered by start time.
- A document action that records a status change and publishes it in one step, adding
  `liveStatus.updatedAt` at the same time — the field is deliberately absent until something
  writes it.
- Draft mode for reviewing an unpublished programme.
- Cache tags split by volatility, invalidated by a signed webhook.

**Validation:** Manual end-to-end: change a status, observe the public page update. Webhook
delivery confirmed in Sanity's log.

**Documentation:** ADR on the freshness mechanism. Webhook and incident sections of
`docs/runbook.md`.

**Exit criteria:** A status change made in the Studio appears on the deployed site within seconds,
while unrelated content stays cached.

**Commit boundaries:** `feat(sanity): add live status to sessions` · `chore(migration): backfill
live status` · `feat(studio): add the live operations pane` · `feat(studio): publish status changes
in one action` · `feat: add draft mode` · `feat(cache): invalidate by tag from a signed webhook`

---

## Milestone 6 — Accessibility, resilience, performance ⬜

**Outcome:** The schedule is usable by keyboard and screen reader, degrades safely, and meets its
performance budget.

**Technical tasks**
- Timetable markup reconciling a visual grid with a linear reading order.
- Announcements for live status changes.
- Focus management and visible focus styles throughout.
- `prefers-reduced-motion` honoured by every animation.
- Degraded rendering when a volatile fetch fails.
- Automated accessibility checks and one end-to-end journey.

**Validation:** Automated accessibility checks on both routes; a manual screen-reader pass;
Lighthouse against the stated budget, reported as measured.

**Documentation:** `docs/testing.md`. ADR on the timetable's markup.

**Exit criteria:** The critical journey passes by keyboard alone; automated checks are clean;
measured results are recorded honestly.

**Commit boundaries:** `fix(a11y): …` · `test: add end-to-end and accessibility checks` · `perf: …`

---

## Milestone 7 — Deployment and documentation ⬜

**Outcome:** The system is deployed, reproducible by someone who has never seen it, and explained.

**Technical tasks**
- Vercel deployment with environment variables per environment.
- Continuous integration: types, lint, build, generated-artefact freshness, tests.
- Complete `docs/architecture.md`, `docs/runbook.md`, `docs/local-development.md`,
  `docs/testing.md`, `docs/llm-use.md`.
- Remaining ADRs.

**Validation:** A clean clone reproduced from the README alone, following the written steps
literally.

**Exit criteria:** The deployed URL works, continuous integration is green, and every runbook
procedure has been executed at least once — anything not executed is marked unverified.

**Commit boundaries:** `ci: add checks` · `docs: complete architecture and runbook` · `docs: record
agent use`

---

## Out of scope for this iteration

Recorded as scope decisions, with reasons, in `README.md`:

- A speaker index with reverse-referenced session lists.
- Real-time push updates in place of tag invalidation — see the ADR on content freshness.
- A personal agenda saved in the browser.
- Generated social images.
- Interface translation. Session *language* is content and is modelled; translating the interface
  is a separate concern with its own architecture.
