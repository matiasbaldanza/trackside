# Architecture

> **Outline.** Sections are written as the corresponding work lands, so that this document
> describes the system that exists rather than the one that was intended. Empty sections are
> listed deliberately — a gap here means the work has not been done, not that it was forgotten.

## System shape

Three parts:

- **The Next.js application** — the public schedule, rendered on the server, deployed to Vercel.
- **Sanity Studio** — the editorial interface, served by that same application at `/studio`. See
  [ADR-0001](./decisions/0001-embed-sanity-studio-in-the-next-application.md).
- **Sanity's Content Lake** — where content actually lives. A managed service with no self-hosted
  equivalent; the Studio and the application are both clients of it.

The application reads content on the server, so a visitor's browser never talks to the Content
Lake. The Studio, running in the editor's browser, does — which is why its origin must be
registered for CORS while the public site needs no such registration.

### The Studio's client boundary

The Studio is rendered through an explicit `"use client"` boundary
(`src/app/studio/[[...tool]]/Studio.tsx`) rather than directly from the route's page component.
This is not stylistic.

Importing `sanity.config.ts` from a Server Component pulls the entire `sanity` package into the
React Server Components graph. Under the `react-server` export condition, some of its dependencies
resolve to server-only builds — `swr` exports no default there, which Sanity's validation
utilities import as one — and the route fails to compile:

```
Export default doesn't exist in target module
  import useSWR from "swr";
```

Moving the config import behind a client boundary keeps the Studio's module graph in the client
layer, where it belongs. The Studio is a client application; the boundary is drawn where the truth
already was.

### Environment

All environment access goes through `src/lib/env.ts`, which validates on read and fails with a
message naming the missing variable. `sanity.cli.ts` is the single deliberate exception: the CLI
runs in plain Node without Next.js module resolution, and a missing value there breaks a
developer's command rather than a visitor's request.

## Content model

_To be written in Milestone 2._ Documents and objects, the relationships between them, and why
each entity is a document rather than an inline object. How sessions represent time, and why
conference days are not modelled.

## Validation

_To be written in Milestone 2._ Which rules block publishing and which only advise, and the
reasoning behind that split. Where scheduling logic lives, and why it is expressed as pure
functions rather than inside the schema.

## Data access

_To be written in Milestone 4._ The boundary around Sanity, the typed query layer, the single
fetching helper, and how generated types flow from the schema to the components.

## Rendering and component boundaries

_To be written in Milestone 4._ What renders on the server, the two Client Components and the
reason each one cannot be a Server Component, and how filtering works without client state.

## Timezones

_To be written in Milestone 4._ Where time is stored, where it is converted, the hydration hazard
created by rendering a viewer's local time, and how it is contained.

## Caching and invalidation

_To be written in Milestone 5._ Cache tags, their lifetimes, the webhook that invalidates them,
and what happens when a webhook is never delivered.

## Editorial workflow

_To be written in Milestone 5._ The two Studio panes, the publish-in-one-step document action, and
draft mode.

## Accessibility

_To be written in Milestone 6._ How the timetable reconciles a visual grid with a linear reading
order, and how live changes are announced.

## Performance

_To be written in Milestone 6._ The budget, the measured result, and where the risks were.

## Hosting, plans, and portability

_To be written in Milestone 7._ What is hosted where, the constraints of the Sanity plan in use,
what is portable off this stack, and what is not.
