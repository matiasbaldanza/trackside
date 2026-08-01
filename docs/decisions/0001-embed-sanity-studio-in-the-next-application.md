# ADR-0001: Embed Sanity Studio in the Next.js application

- **Status:** Accepted
- **Date:** 2026-07-31

## Context

Sanity Studio is a React application that has to be hosted somewhere. Three arrangements are
common, and the choice affects how the project is deployed, how it is reproduced by a new
contributor, and how tightly the editorial and public surfaces stay in step.

The schema is not merely configuration here. Validation rules encode scheduling constraints — a
session cannot overlap another in the same room — and those same rules are read by the public
schedule. Schema and frontend change together far more often than either changes alone.

## Decision

The Studio is mounted inside the Next.js application at `/studio`, in the same repository and the
same deployment.

## Alternatives considered

**A separate repository, deployed to `sanity.studio` via `sanity deploy`.**
For: a clean separation of editorial tooling from the public site; Sanity hosts it at no cost;
the public application stays smaller. Against: the schema and the queries that depend on it live
in different repositories, so a change that spans both cannot be reviewed as one diff and cannot
be reverted as one commit. Type generation crosses a repository boundary. A contributor has to
clone, install, and run two projects to see the system work. The separation is real but it splits
things that change together, which is the wrong seam.

**A separate directory in this repository, deployed independently.**
For: one clone, one review surface, shared types without publishing a package. Against: two build
pipelines, two deployments, two sets of environment variables, and two URLs to keep in sync, in
exchange for an isolation this project has no need for. The cost is paid continuously; the benefit
is hypothetical.

**Embedded in the Next.js application at `/studio`. [chosen]**
For: one repository, one deployment, one command to run everything, and one diff for changes that
span schema and frontend. The Studio shares the application's TypeScript configuration and
generated types directly. A reviewer runs `pnpm dev` and has both the public schedule and the
editorial tooling in front of them. Against: Studio dependencies are present in the application's
dependency tree, and the Studio route must be excluded from the public site's assumptions about
layout, metadata, and caching.

## The vendor's default points the other way

Sanity's own guided setup scaffolds a monorepo with the Studio and the web application as separate
projects, and instructs explicitly that the Studio should not be embedded in the Next.js
application. That is a considered recommendation from the people who maintain the tool, and
disagreeing with it deserves a stated reason rather than silence.

The recommendation optimises for a Studio with a lifecycle of its own: maintained by a different
team, released on a different cadence, or serving more than one front end. Under those conditions
the coupling described above is a liability rather than a convenience.

None of those conditions hold here. There is one front end, one release cadence, and a schema
whose validation rules encode scheduling constraints that the public schedule reads directly.
Splitting the repository would put a review boundary through the middle of changes that are single
changes. Embedding remains fully supported: `next-sanity` documents this exact arrangement
([Studio embedding guide](https://www.sanity.io/docs/studio/embedding-sanity-studio)), and this
repository uses `next-sanity` 13.2.3 with `sanity` 6.8.0, whose peer ranges cover Next 16 and
React 19 — see `package.json`. The divergence costs conformity with a default, not capability.

If any of those conditions later become true, this ADR should be revisited on that basis rather
than on the strength of the default.

## Consequences

- One deployment target and one set of environment variables.
- Schema, queries, and the components that render their results are reviewed together.
- Generated types flow from schema to frontend with no publishing step.
- The Studio route sits outside the public site's root layout and is excluded from its caching and
  metadata conventions. This must be handled explicitly rather than assumed.
- The application bundle includes Studio dependencies. They affect install time and build duration,
  and they are confined to the `/studio` route segment.

  **Measured on 2026-07-31**, against a production build with an empty schema: the prerendered `/`
  references 7 client scripts totalling 613 KB uncompressed, **none of which contain Sanity code**.
  Of 210 client chunks in the build, 166 (6.0 MB) contain Sanity code and none are reachable from
  `/`. Route-segment isolation therefore holds in practice, not only in principle.

  This measurement is worth repeating once the schedule route exists and imports the query layer,
  because that is where the boundary could plausibly leak. The 613 KB figure is uncompressed and is
  Next.js's own baseline, not a budget result; the performance budget is assessed over the wire in
  Milestone 6.
- Studio availability is coupled to the public application's availability. For a system whose
  editorial surface is only used while the public surface is also needed, this is acceptable.

## Revisiting

Reopen this if the editorial surface grows beyond conference programming and needs its own release
cadence, if Studio dependencies begin to affect the public site's build in ways that cannot be
contained at the route boundary, or if the Studio needs to be reachable when the public site is
deliberately offline.
