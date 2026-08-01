# ADR-0004: Derive fixture document ids from slugs

- **Status:** Accepted
- **Date:** 2026-08-01

## Context

Sanity's own best-practices guidance is explicit:

> Let Sanity generate `_id` values for ordinary documents. Do not create deterministic UUIDs,
> slug-derived IDs, or legacy-system IDs when creating documents. Use explicit document IDs mainly
> for singleton documents controlled by Studio Structure.

The fixture programme in `fixtures/nodo-conf.ts` does the opposite. Every document — 4 rooms, 18
speakers, 26 sessions — carries an id derived from its slug: `session-apertura-nodo`,
`track-auditorio`, `speaker-valentina-arce`. Only the event is a singleton, the one case the
guidance sanctions.

Diverging from vendor guidance silently is how a repository loses its reasoning, so the divergence
is recorded here rather than left as an oddity for a reader to notice.

The requirement that forces it: **seeding must be repeatable.** The fixture set is loaded and
reloaded constantly — after a schema change, after a reset, on a colleague's machine, on a fresh
dataset. A seed that duplicates its content on a second run is a seed nobody dares run twice, and
that is the same as having no seed.

## Decision

Fixture documents carry stable, slug-derived ids, and are written with `createOrReplace`.

This applies **only to fixture content**. Documents created by editors in the Studio get generated
ids as normal — nothing in the schema or the application assigns ids.

## Alternatives considered

**Generated ids, with a mapping file.** Seed once, record the returned `_id` values, and consult
that map on subsequent runs to know what to replace.
*For:* follows the guidance exactly. *Against:* the map becomes a second source of truth that is
not in version control and differs per dataset. A colleague cloning the repository has no map, so
their first seed is a fresh set of documents and their second duplicates them unless the map is
also shared — at which point it is a lockfile for content, with none of the tooling a lockfile
usually has.

**Generated ids, deleting everything before each seed.** Wipe the fixture-managed types, then
create fresh documents.
*For:* follows the guidance, needs no map, and is genuinely simple. *Against:* it makes every seed
destructive. `pnpm seed` currently only writes, which is what makes it safe to run against a
dataset someone is working in; deletion lives behind `pnpm content:reset` and a dry run for exactly
that reason. Merging the two would remove the safe option, and drafts in progress would be
collateral on every run.

**Slug-derived ids. [chosen]**
*For:* the id is a pure function of the fixture source, so seeding is idempotent with no external
state, identical on every dataset and every machine, and diffable in review. It also makes a seeded
document trivially traceable back to the line that produced it.
*Against:* everything under *Consequences* below.

## Why the guidance says otherwise, and why it does not bind here

The rule is aimed at documents created at runtime — by editors, by imports from a legacy system, by
application code. There, deterministic ids collide when two sources derive the same key, couple
content permanently to whatever produced the string, and break when the source value changes.
Every one of those hazards is real.

Fixture seeding inverts the requirement. There is exactly one source, it is version-controlled,
and reproducibility is the entire point. The property that makes deterministic ids dangerous at
runtime — that the same input always yields the same id — is precisely what is wanted here.

## Consequences

- `pnpm seed` is idempotent and needs no state beyond the repository.
- **Changing a slug in the fixtures creates a new document rather than renaming the old one.** The
  next seed writes `session-new-slug` and leaves `session-old-slug` in place, so the programme
  gains a duplicate and the schedule shows both. Renaming a fixture slug therefore means running
  `pnpm content:reset`, not `pnpm seed`. This is the sharpest cost of the decision and the one most
  likely to catch someone out.
- Fixture ids are visible in URLs and in the Studio, which makes them readable, and also means an
  id leaks the original slug even after a title changes.
- Ids must contain no dots. The Content Lake treats any `_id` containing one as private regardless
  of dataset visibility, which once made an entire seeded programme invisible to the public API
  while the Studio looked complete. Enforced by a test in `fixtures/nodo-conf.test.ts`.
- The application never assigns an id, so this decision cannot leak into editorial content.

## Revisiting

Reopen if fixture content is ever generated from a source outside this repository, if seeding needs
to merge with editorially-created documents rather than replace its own, or if slug churn makes the
duplicate-on-rename cost bite more often than the reset command absorbs it.
