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

## Consequences

- One deployment target and one set of environment variables.
- Schema, queries, and the components that render their results are reviewed together.
- Generated types flow from schema to frontend with no publishing step.
- The Studio route sits outside the public site's root layout and is excluded from its caching and
  metadata conventions. This must be handled explicitly rather than assumed.
- The application bundle includes Studio dependencies. They are confined to the `/studio` route
  segment, so they do not reach the public schedule's payload, but they do affect install time and
  build duration.
- Studio availability is coupled to the public application's availability. For a system whose
  editorial surface is only used while the public surface is also needed, this is acceptable.

## Revisiting

Reopen this if the editorial surface grows beyond conference programming and needs its own release
cadence, if Studio dependencies begin to affect the public site's build in ways that cannot be
contained at the route boundary, or if the Studio needs to be reachable when the public site is
deliberately offline.
