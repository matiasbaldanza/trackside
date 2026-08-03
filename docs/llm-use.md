# Coding agent use

An honest record of how coding agents were used on this project, and what stayed under manual
control. Kept because "AI-assisted" covers everything from autocomplete to unreviewed generation,
and the difference matters to anyone reading this code.

Updated as work proceeds, not reconstructed at the end.

## Execution model from 2026-08-02

Subsequent work uses two roles where a task benefits from delegation. The lead agent owns
architecture, planning, decomposition, technical decisions, review, and issues requiring senior
engineering judgement. An implementation agent receives one bounded task, follows established
patterns, and makes only local implementation decisions.

Each delegated task states its objective, affected files or directories, constraints, acceptance
criteria, and minimal validation. The lead reviews the resulting diff and the evidence from those
checks before starting the next task. Small or judgement-heavy changes may remain with the lead
when delegation would add coordination without improving the review boundary.

This is a prospective execution change. Milestones 1–4 used the interactive model recorded below;
their history is not restated as though work had been divided between these roles. `AGENTS.md` is
the canonical definition of the workflow.

## Tooling

Claude Code (Opus 5), driven interactively from the repository. CodeRabbit reviews pull requests.

Sanity's own [`sanity-best-practices`](https://github.com/sanity-io/agent-toolkit) agent skill is
installed locally, from commit `dfcdd28`. It is documentation only — 25 markdown files, nothing
executable — and it is advisory: `AGENTS.md` records the precedence when it disagrees with a
decision made here.

It was added part-way through, after the content model was built, which makes its value measurable
rather than assumed. Of the three Sanity-specific mistakes made before it was installed, it would
have prevented one outright (`@sanity/icons` v5 subpath imports — the subject of its most recent
commit), steered away from a second (it advises against slug-derived document ids, which is how the
dotted-id failure arose), and missed the third entirely (`rule.warning(message)` adding no
constraint: its examples use the correct form but never name the trap).

## Milestone 1 — Foundation

### What the agent did

- Scaffolded the Next.js application and wrote the Sanity configuration, the Studio route, and
  `src/lib/env.ts`.
- Drafted every document in `docs/`, `AGENTS.md`, `CLAUDE.md`, and `README.md`.
- Diagnosed the `/studio` build failure — `swr` having no default export under the `react-server`
  condition — and implemented the client-boundary fix.
- Ran the checks recorded in `docs/testing.md` and measured the route payloads cited in ADR-0001.

### What stayed manual

- The product concept and its scope. The conference framing, and the decision that live schedule
  changes are the interesting problem, came from the repository owner — including rejecting an
  earlier proposal in favour of this one.
- Repository and content naming.
- The choice to keep a single package rather than split into a workspace. The agent recommended it
  and argued the case; the decision was the owner's, taken after asking what Sanity's own guidance
  says and why.
- Creating the Sanity project, issuing tokens, and registering the CORS origin.
- Every commit and merge. All changes were reviewed before commit.

### Where agent output was wrong or was rejected

This section exists because it is the useful one.

- **The agent claimed nothing had been pushed to the remote when both branches were already
  pushed.** It had not checked. The correction mattered: an amended commit then required a
  force push rather than the ordinary one it had described.
- **`docs/local-development.md` stated that editing content in the Studio requires an API token.**
  That is wrong — the embedded Studio authenticates the signed-in Sanity user through a browser
  session, and tokens serve only server-side and command-line operations. Caught in review by
  CodeRabbit, not by the agent, and not by the owner.
- **ADR-0001 asserted that Studio dependencies do not reach the public route's payload without
  measuring it.** The repository's own rules forbid claiming an unrun result. Also caught by
  CodeRabbit. The claim turned out to be true, and the ADR now carries the measurement instead of
  the assertion — but it was an assertion when it was written.
- **`AGENTS.md` listed `pnpm seed` among runnable commands** before the script existed, and stated
  an environment-variable invariant that its own `sanity.cli.ts` exception contradicted.
- **Three files described read access as "bounded by dataset visibility and CORS".** CORS
  restricts browser origins; it is not a data-access control, and a public dataset is readable by
  anyone holding the project ID over plain HTTP. The agent had *itself* demonstrated this with a
  `curl` request while verifying the dataset was public, and then wrote the opposite in prose.
  Caught by CodeRabbit on the second review round.
- **`docs/untracked/README.md` named `.env.local` as the single place secrets live.** True only
  for local development; continuous integration and deployed environments have their own stores,
  and a rotation must reach all of them.

The pattern is consistent and worth naming: the agent's errors were **confident statements about
things it had not verified**, not mistakes in code. The code compiled and the prose was plausible.
That is the failure mode to review for.

The CORS case sharpens it further. The agent did not lack the evidence — it had produced the
evidence itself, minutes earlier, and still wrote a claim the evidence contradicted. Verifying
something and then describing it are separate acts, and the second does not inherit the rigour of
the first.

### One review comment was rejected

CodeRabbit asked that `sanity.cli.ts` import the centralised environment module. It is the one file
that reads `process.env` directly, deliberately: the Sanity CLI loads it in plain Node without
Next.js module resolution or the `@/` path alias, and `src/lib/env.ts` throws at read time on any
missing variable, which would break CLI commands that need none of them. The invariant in
`AGENTS.md` was amended to state the exception rather than the code changed to hide it.

## Milestone 3 — Fixture content

### Where agent output was wrong

Two errors, both silent, both caught only by checking the result rather than the report.

- **Fixture documents were given ids like `session.keynote`.** The Content Lake treats any `_id`
  containing a dot as private regardless of dataset visibility — the same mechanism that keeps
  `drafts.*` unreadable. Seeding reported success, all 49 documents were written, and the Studio
  displayed the full conference. The public API returned nothing. The public schedule would have
  been empty while every authenticated view looked perfect.

  The agent had documented this exact rule in `docs/runbook.md` one milestone earlier, as the
  reason a public dataset does not leak drafts, and then wrote fixture ids that violated it.

- **Session times were stored with a UTC offset rather than normalised.** Sanity persists a
  datetime exactly as given, so `2026-09-24T08:30:00-03:00` was stored verbatim while the Studio's
  own input writes `Z`-suffixed UTC. GROQ compares datetime strings lexicographically unless cast,
  so a dataset holding both forms filters incorrectly. The instants were right; every range query
  over them would have been wrong.

Both are now enforced by tests over the fixture data, and both are recorded where they belong —
the id rule in the runbook, the storage format in ADR-0002.

### Found by looking at the Studio, not the code

Two things no test would have caught, both surfaced by the repository owner opening the Studio:

- **Validation errors were attached to the document rather than to fields.** The rules worked and
  the messages were specific, but the editor saw only *"There are validation errors that need to be
  fixed before this document can be published"* unless they opened a panel. The care taken over the
  message wording was invisible in the place it mattered.
- **Session previews truncated.** Full room names pushed the subtitle past the width of the list
  pane, and what disappeared was the duration — the part an operator most needs. Fixed by preferring
  the room's short name, which is what that field was for.

Neither is a correctness bug, and neither would have failed a test. They are the difference between
validation that technically works and validation an editor can use, which is the whole argument
this project is making.

### The pattern, restated

Milestone 1's errors were confident claims about unverified things. Milestone 3's were different
and worse: **operations that reported success while achieving nothing.** `pnpm seed` printed
"Done" and wrote 49 documents that no reader could see.

The generalisation is that a tool's own success message is not evidence. What settled both cases
was querying the public API as an anonymous reader — checking the result the system is supposed to
produce, from the position of the person it is produced for.

## Where this project diverges from vendor guidance

Recorded so the divergence is visible rather than accidental.

**Document ids.** The skill says to let Sanity generate `_id` values and to reserve explicit ids
for singletons; the fixture programme uses slug-derived ids throughout. Recorded as
[ADR-0004](./decisions/0004-derive-fixture-document-ids-from-slugs.md), which argues the two
alternatives that follow the guidance and states the cost of the choice — renaming a fixture slug
creates a second document rather than renaming the first, so a rename means `content:reset`, not
`seed`. Content created by editors in the Studio gets generated ids as normal.

**Studio placement and content freshness.** Both covered by ADRs, both deliberate, both against
the vendor default. See [ADR-0001](./decisions/0001-embed-sanity-studio-in-the-next-application.md).

## What this means for reviewing the code

Read the claims, not just the code. Anywhere this repository asserts that something was measured,
verified, or observed, that statement is the part most worth checking — it is where the agent has
historically been wrong, and it is why `docs/testing.md` records only checks that actually ran.
