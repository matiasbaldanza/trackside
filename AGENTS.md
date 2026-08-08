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

- Tag each merged milestone. See below.

### Branches, tags and previews

**Branch names**

| Pattern | For |
| --- | --- |
| `milestone/N-short-name` | One per milestone, one pull request |
| `chore/…`, `fix/…`, `docs/…` | Work that is not a milestone |
| `preview/milestone-N` | A frozen deployment pointer. Never merged, never deleted, never moved |

**Pushing is the repository owner's call.** Commit freely; do not `git push`. CodeRabbit reviews
every push, and pushing an unfinished branch spends a review pass on a state that is already
being rewritten — the findings that matter then arrive buried among findings that were already
fixed before they were raised.

**Merge commit bodies.** GitHub generates the title line; write the body in three parts:

1. What the milestone delivers, in plain terms.
2. Which decisions it produced, naming the ADRs.
3. What was verified — **and what was not.**

The third part is not optional. `git log --first-parent` shows one commit per milestone, so for
anyone reading `main` this body *is* the milestone. A reader who cannot tell which claims were
measured and which were assumed has been given a summary, not a record.

**Tags.** Annotated, `milestone-N`, once the merge is on `main`:

```bash
git checkout main && git pull --ff-only && git tag -a milestone-4 -m "Milestone 4 — The public schedule" && git push origin milestone-4
```

`milestones-2-and-3` predates this convention — two milestones landed in one pull request. It
stays as it is. Retagging would break anything already pointing at it, and the irregularity is a
true record of what happened.

**Preview branches.** From Milestone 4 onward, every milestone keeps a permanently reachable
deployment, so milestones can be compared side by side rather than described. Branch from the
merge commit on `main` and leave it alone forever:

```bash
git branch preview/milestone-4 <merge-commit>
git push origin preview/milestone-4      # the owner publishes; do not push automatically
```

The push is the owner's step, not the agent's — pushing is the maintainer's call (see above), and
Vercel builds the preview from the *remote* branch, so a local branch alone produces no preview.

Vercel gives every branch a stable alias, which moves only when the branch moves, so a branch that
never moves is a permanent URL needing no deployment hash looked up and no alias assigned by hand.
The alias is project- and team-specific and takes the form
`<project>-git-<branch>-<account>.vercel.app`, with any slash in the branch name replaced by a
dash. It does **not** share a stem with the production URL: the branch alias uses the bare project
name (`trackside`), while production is served at a separate chosen alias
(`https://trackside-events.vercel.app`). Read the exact strings from `docs/deployments.md`, never
assume the branch alias from the production one.

> **Verified 2026-08-07.** `preview/milestone-4` was pushed and its preview is reachable. The
> mechanism held: a frozen branch keeps a stable preview URL. The observed alias is
> `trackside-git-preview-milestone-4-<account>.vercel.app` — recorded in full in
> `docs/deployments.md`.

Two properties to keep in mind:

- **The branch must never move.** A single extra commit silently repoints a URL that may already
  have been cited somewhere outside this repository.
- **A preview freezes the code, not the content.** Every deployment reads the live dataset, so an
  old preview shows old code against *current* content. That is precisely what makes two previews
  comparable — same content, different code, so the difference is the change — but it is not an
  archive of how the site looked on a given date, and must not be described as one.

`docs/deployments.md` records the URLs.

### Process

- `docs/roadmap.md` is the living roadmap and is updated as milestones complete.
- Work stops at milestone boundaries for human review.
- Changes are reviewed by the repository owner, who may perform commits directly.

### Agent execution workflow

Agent-assisted work separates architectural oversight from bounded implementation.

The **lead agent** owns architecture, planning, task decomposition, technical decisions, review,
and issues that require senior engineering judgement. It preserves the roadmap and the decisions
already recorded here and in ADRs. It does not revisit completed work or settled decisions unless
new evidence shows a concrete incompatibility.

An **implementation agent** executes one bounded task at a time. It follows the patterns and
decisions already present in the repository, makes only local implementation decisions, and
escalates anything that would change architecture, scope, public behaviour beyond the task, or a
recorded decision.

Where delegation is useful, the lead writes a self-contained task brief before implementation:

- **Objective:** one observable outcome.
- **Affected files or directories:** the expected working set, narrow enough to avoid unnecessary
  repository exploration.
- **Constraints:** applicable invariants, decisions, scope boundaries, and explicit non-goals.
- **Acceptance criteria:** facts that must be true when the task is complete.
- **Minimal validation:** the smallest checks that provide credible evidence for those criteria.

Not every change warrants delegation. The lead may implement a small or judgement-heavy task
directly when handing it off would add more coordination than useful separation. Whether work is
delegated or direct, the same brief is the standard for deciding its scope and completion.

After an implementation task, the lead reviews the diff and the validation evidence for
correctness, consistency, and architectural alignment before the next task begins. A tool's success
message is not sufficient evidence; verification checks the result from the perspective that uses
it. The repository owner remains the final reviewer at milestone boundaries.

### Precedence

Guidance can conflict. When it does, this order settles it:

1. **Architecture Decision Records** in `docs/decisions/`.
2. **This file.**
3. **Vendor guidance** — Sanity's `sanity-best-practices` agent skill and Sanity's documentation;
   Next.js's own documentation, which version 16.2 ships **bundled** at
   `node_modules/next/dist/docs/` (`01-app/` is the App Router).

**Read the bundled Next.js docs before writing Next.js code.** They are the documentation for the
exact version installed — 16.2.12 — rather than whatever a general model learned about an earlier
release, and App Router semantics have moved release to release. There is no substitute skill for
this: Next.js 16.2 bundles the docs but does not generate an `AGENTS.md`, which is why this
instruction exists here rather than being provided by the framework. Consult them for anything
touching rendering, caching, `params`/`searchParams`, route segment config, or metadata.

Vendor guidance is well-informed and worth following by default; it is not written for this
project. Where it contradicts a recorded decision, the decision stands — ADR-0001 keeps the Studio
embedded although the Sanity skill assumes a standalone one, and the freshness decision keeps
webhook invalidation although Sanity's Next.js guide assumes the Live Content API.

**A conflict is not permission to reverse a decision quietly.** If the vendor raises an argument
the ADR did not consider, that is a new ADR superseding the old one, with the argument written
down. Silently drifting toward a default is how a repository loses its reasoning.

### Honesty rules

- **Never claim a test, build, type check, or performance measurement passed unless it actually
  ran.** Report real output, including failures.
- Anything not executed is marked unverified rather than presented as verified.
- No dependency is added without a stated reason, recorded where it is introduced.
- No speculative abstraction. Build for the case in front of you; generalise when a second case
  actually arrives.

### Reporting register

Reports to the maintainer are written in **ASD-STE100 Simplified Technical English**. A report is
direct communication with the maintainer: chat replies, status updates, and summaries of work done.

The rules are the usual STE ones. Write short sentences. State one idea in each sentence. Use the
active voice. Use simple verb tenses. Use plain, consistent words — the same word for the same
thing every time.

This governs how the agent talks to the maintainer. **It does not change the register of the
repository's own prose.** ADRs, `docs/`, the README and commit messages keep the documentation tone
above; those documents persist and argue a case, so they stay in full English. The reports are read
once and must be fast to parse. The two registers are separate on purpose.

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
