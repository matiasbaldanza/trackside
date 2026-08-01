# AGENTS.md

Canonical instructions for this repository — for human contributors and coding agents alike.
This is the single source of truth. Other instruction files point here rather than restating it.

---

## What this project is

**trackside** is a conference programme and run-of-show system.

A multi-track conference publishes its programme; attendees browse it in their own timezone; and
operators update it while the event is running, when sessions are delayed, moved between rooms, or
cancelled.

Seeded content describes **Nodo Conf**, a fictional two-day conference in Buenos Aires.

### Scope

In scope: the programme itself, and the operational tooling that keeps it accurate during an
event.

Out of scope, deliberately: attendee accounts, ticketing, networking and messaging, exhibitor or
sponsor management, and CFP submissions. These are not missing features — they belong to a
different product. Scope decisions are recorded with their reasoning in `README.md` and
`docs/decisions/`.

### The central design idea

A conference schedule is relational data with **two editors who want opposite things from the
CMS**:

- The **programme editor** builds the schedule over weeks, at a desk, and *wants* to be blocked
  when they make a structural mistake.
- The **event operator** is a volunteer with a phone in a hallway who must mark a session delayed
  in seconds, and must never be blocked by an unrelated editorial warning.

Resolving that tension inside Sanity is what makes the public schedule correct. Most architectural
decisions in this repository trace back to it.

---

## Technical baseline

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16, App Router |
| UI | React 19, TypeScript, Tailwind 4 |
| Components | shadcn/ui (vendored, not imported as a package) |
| CMS | Sanity Studio, embedded at `/studio` |
| Package manager | **pnpm** — never npm or yarn |
| Node | 22+ |
| Hosting | Vercel (app and Studio in one deployment) |

---

## Working method

### Documentation tone — non-negotiable

The repository documents a project, not an exercise.

- **Never** describe this project as a demo, a portfolio piece, a sample, a test, or a time-boxed
  sprint — not in the README, docs, ADRs, code comments, or commit messages.
- **Never** justify a decision by schedule pressure. Every trade-off is argued on engineering
  merit, or stated as an explicit product-scope choice.
- Unbuilt work is listed as a scope decision **with a reason**, never as something there was no
  time for.
- Do not position the project against commercial products by name.

### The README describes the present

`README.md` states what the project can do **today**, not what it is intended to do. Its *Current
state* section is updated in the same commit as any change to what the system can actually do, and
at every milestone boundary.

A README that describes the finished system while the repository contains a scaffold is the most
common way for a project to start lying about itself. Planned work belongs in
`docs/roadmap.md`, where it is explicitly marked as planned.

### Diagrams

Use Mermaid, fenced as ```` ```mermaid ````. GitHub renders it natively, so a diagram stays in the
document it explains, versions with the code, and is reviewable as a diff. Never commit exported
images of diagrams — they rot silently the moment the thing they depict changes.

**Include a diagram where prose is genuinely worse:**

- Relationships between content types — an `erDiagram` shows cardinality that a paragraph fumbles.
- Anything with ordering across components, such as a webhook invalidating a cache
  (`sequenceDiagram`).
- State a document moves through, such as a session's live status (`stateDiagram-v2`).
- Where a request is served from, and what it crosses.

**Do not add one where prose is fine.** A diagram restating a list of four files is decoration, and
decoration in documentation costs the same to maintain as substance while carrying none. If the
diagram and the surrounding text say the same thing, delete one of them.

Label edges. An unlabelled arrow between two boxes asserts that a relationship exists without
saying what it is, which is usually the part the reader needed.

### Decisions

- Architecture Decision Records live in `docs/decisions/`, numbered and dated, following
  `docs/decisions/TEMPLATE.md`.
- **An ADR is written when the decision is made, not backfilled later.** Backfilled records
  misrepresent the process, which defeats their purpose.
- An ADR is warranted when a choice was genuinely contested, has consequences that outlive the
  code, or would otherwise prompt "why is it like this?" from a new contributor. Routine choices
  do not need one.
- Rejected alternatives are recorded with the reasoning that rejected them. **The reasoning is the
  deliverable** — a rejected option explained well is worth more than a shipped feature explained
  poorly.

### Commits

- [Conventional Commits](https://www.conventionalcommits.org/). Types in use: `feat`, `fix`,
  `chore`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`.
- Scope where it clarifies: `feat(sanity):`, `feat(schedule):`, `fix(a11y):`.
- **Atomic** where that creates a meaningful review boundary. A commit should be reviewable on its
  own and should not mix a refactor with a behaviour change.
- **No `Co-authored-by` trailers.**
- One branch and one pull request per milestone.
- **Merge with a merge commit. Never squash, and do not rebase-merge.** The three strategies
  differ in what survives:

  | Strategy | Atomic commits | Milestone visible in history |
  | --- | --- | --- |
  | Squash | Lost | Yes, but as one opaque commit |
  | Rebase-merge | Kept | **No** — flat history, no grouping, no PR reference |
  | Merge commit | Kept | Yes — the merge commit names the milestone and the PR |

  Squashing destroys the commit boundaries the roadmap is built around. Rebase-merge keeps them
  but discards the grouping, leaving `main` a flat sequence in which nothing marks where a
  milestone began or ended — the record then exists only on GitHub, so a clone of the repository
  cannot answer the question.

  The merge commit is the milestone boundary. `git log --first-parent` reads as one line per
  milestone; the full log still shows every atomic commit.

- Tag each merged milestone: `git tag -a milestone-N -m "Milestone N — Name"`.

### Process

- `docs/roadmap.md` is the living roadmap and is updated as milestones complete.
- Work stops at milestone boundaries for human review.
- Changes are reviewed by the repository owner, who may perform commits directly.

### Honesty rules

- **Never claim a test, build, type check, or performance measurement passed unless it actually
  ran.** Report real output, including failures.
- Anything not executed is marked unverified rather than presented as verified.
- No dependency is added without a stated reason, recorded where it is introduced.
- No speculative abstraction. Build for the case in front of you; generalise when a second case
  actually arrives.

---

## Architecture rules

These are invariants. Breaking one requires an ADR that supersedes it.

1. **All Sanity access in the application is confined to `src/lib/sanity/`.** No route, component
   or utility elsewhere imports the Sanity client; they consume typed view models, never raw
   Sanity documents. This keeps the content source replaceable and the application auditable.

   The Studio is not bound by this and cannot be. Schema validation in `sanity/lib/validation.ts`
   queries sibling documents through the client Sanity hands it, because a rule like "this room is
   already booked" is a question about the dataset. That code ships to the Studio, never to the
   public application, and would be the first thing discarded if the content source were replaced
   — along with the schema it validates.
2. **One data-access wrapper expresses caching policy.** Cache tags and revalidation live in a
   single fetch helper — not scattered across call sites.
3. **Server Components by default.** A Client Component requires a reason that could not be met on
   the server, stated in a comment at the boundary. Filters and navigation use `<Link>` and
   `searchParams`, not client state.
4. **Environment variables are validated once**, in `src/lib/env.ts`. No application or Studio code
   reads `process.env` directly. `sanity.cli.ts` is the single exception and is annotated as such:
   it is loaded by the Sanity CLI in plain Node, without Next.js module resolution or the `@/`
   path alias, and its failure mode is a developer's command rather than a visitor's request.
   Adding a second exception requires an ADR.
5. **Scheduling logic lives in pure functions** shared by the Sanity schema and the test suite, so
   validation is testable without booting a Studio.
6. **Generated artefacts are committed** (`schema.json`, `sanity.types.ts`) and verified in CI. A
   schema change that was not propagated must fail the build rather than drift.

---

## Accessibility

Treated as an architectural concern, not a final pass.

- The timetable renders as per-track semantic lists arranged visually into a grid: a coherent
  linear reading order for assistive technology, spatial comparison for sighted users.
- Status is never carried by colour alone.
- Times use `<time datetime>`.
- Live schedule changes announce via `aria-live="polite"`.
- Every interactive element is keyboard reachable with a visible focus style.
- All motion respects `prefers-reduced-motion`.

---

## Commands

Every script, with what it writes and what it costs to run, is in
**[`docs/scripts.md`](docs/scripts.md)** — the canonical list. The ones used constantly:

```bash
pnpm dev          # app on / and Studio on /studio
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # unit tests
pnpm schema:check # regenerate schema.json and sanity.types.ts, fail on a diff
```

**Anything destructive dries-run by default.** `content:reset` and `migration:run` both report and
exit unless given `-- --no-dry-run`, because a destructive command whose default is to destroy will
eventually be run by accident.

Operational procedures — provisioning, tokens, CORS, backup and restore, content migrations,
webhook configuration, deployment, and incident handling — are in `docs/runbook.md`.

---

## Documentation map

| File | Purpose |
| --- | --- |
| `README.md` | What the project is and how to run it |
| `docs/roadmap.md` | Living roadmap, milestone by milestone |
| `docs/scripts.md` | Every pnpm script, what it writes, what it costs |
| `docs/architecture.md` | How the system fits together, and why |
| `docs/decisions/` | Architecture Decision Records |
| `docs/testing.md` | What is tested automatically, and what is verified by hand |
| `docs/local-development.md` | Reproducing the project locally |
| `docs/runbook.md` | Operational procedures |
| `docs/llm-use.md` | How coding agents were used, and what stayed under manual control |
