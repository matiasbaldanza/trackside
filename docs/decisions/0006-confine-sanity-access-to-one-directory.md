# ADR-0006: Confine Sanity access to one directory, behind view models

- **Status:** Accepted
- **Date:** 2026-08-02

## Context

Milestone 4 is the first time the application reads content rather than the Studio. That makes it
the moment to decide how far Sanity reaches into the codebase, because the answer becomes very
expensive to change once fifteen components have imported a client.

The default in every Sanity example, and in most CMS integrations generally, is that a page calls
`client.fetch` with a GROQ string and renders the documents it gets back. It is the shortest path
and it is genuinely fine for a small site. What it produces, at any size, is a codebase where:

- every page owns a fragment of caching policy, and those fragments drift;
- components consume Sanity's document shape — `slug.current`, `track._ref`, `_type` — so the CMS's
  serialisation is spread through the render tree;
- fields the schema calls required arrive typed as nullable, because typegen describes the
  *stored* document and the Content Lake is schemaless;
- and there is nowhere to put a rule that must hold everywhere.

That last point is not hypothetical here. `liveStatus` hides fields by state rather than clearing
them, so a session marked delayed by twenty minutes and then set back to on time still carries
`delayMinutes: 20`. Any component reading `delayMinutes` without checking `state` first will show a
delay on a session that is running fine. With access spread across the render tree, that rule has
to be obeyed at every call site — which means it will eventually not be.

## Decision

**Nothing outside `src/lib/sanity/` imports the Sanity client, writes GROQ, or handles a Sanity
document.**

The directory has four parts and one entry point:

```
src/lib/sanity/client.ts     the single client instance
src/lib/sanity/queries.ts    every GROQ query, via defineQuery
src/lib/sanity/fetch.ts      the only fetch wrapper: tags and revalidation
src/lib/sanity/programme.ts  documents -> view models, pure and tested
src/lib/sanity/index.ts      getProgramme(), getSession(), getSessionSlugs()
```

Routes call the functions in `index.ts` and receive `Programme`, `SessionDetail`, `Room`,
`Speaker` — types defined in this repository, with no nullable fields the schema says are
required, no `_ref`, and no `_type`.

The Studio is not bound by this and cannot be. It is a Sanity application; its schema files and
its validation helpers query the Content Lake directly, and confining them would mean
reimplementing Sanity inside `src/lib/`.

## Alternatives considered

**Fetch directly in each route.** The documented default.
*For:* fewest moving parts, and a reader can see the query next to the markup that uses it.
*Against:* everything in the Context above. Concretely, the caching policy would have to be
repeated at each call site — and this application has two different lifetimes on one page, so
"repeated" means "eventually inconsistent". The `liveStatus` rule would have no home.

**A boundary, but returning Sanity documents.** One directory owning the client and the queries,
handing back the raw projections.
*For:* most of the benefit, none of the mapping code, and typegen's types come free.
*Against:* it draws the line in the wrong place. The documents are the CMS's shape, so components
still destructure `slug.current` and still have to be careful about `delayMinutes`. It centralises
*fetching* without centralising *meaning*, and meaning is what leaks.

**A full repository/port abstraction — an interface, an implementation, dependency injection.**
*For:* a second content source could be added without touching the first.
*Against:* it buys an ability nobody has asked for, at the cost of an indirection every reader
pays for. There is one content source. The functions in `index.ts` are already the interface; if a
second implementation is ever needed, extracting one from four functions with view-model return
types is a morning's work, and doing it now would be designing against an imagined requirement.

**Sanity's Live Content API throughout**, with components subscribing directly.
*For:* the freshest possible content with the least code.
*Against:* it puts the client back into the render tree by design, and moves invalidation inside a
managed abstraction so the reasoning is no longer in this codebase. It is considered properly, on
its own merits, in the ADR on content freshness.

## Consequences

The mapping layer is a pure function from query results to view models, so the rules that matter
most — the `liveStatus` contract, delay applied to a start time, a moved session following its
room — are unit-tested without a network or a Studio. That is the main practical win, and it is
not available at all without the boundary.

Caching policy is written once, in `fetch.ts`, as tags named after what changes rather than what
is displayed.

The costs:

- **A layer to write and keep current.** Adding a field means touching the query, the view model
  and the mapping. The compensation is that forgetting one is a compile error, not a blank space
  on a page.
- **Two sets of types for the same data**, typegen's and this repository's. They are kept in
  agreement by `index.ts` passing a `ProgrammeQueryResult` straight into a mapper that declares
  its own input shape — so a projection that stops matching the schema fails to compile. The input
  types are deliberately wider than typegen's, because typegen describes what the Studio will
  write and the Content Lake will happily return a value removed from the schema last month.
- **Indirection for a reader.** Someone tracing "where does this title come from" passes through
  three files instead of one.
- **A rule that can only be enforced by review.** Nothing mechanically stops a component importing
  `next-sanity`. A lint rule restricting that import path would be the enforcement, and is not
  written.

## Revisiting

If a second content source ever becomes real — a sponsor feed, a separate speaker directory — the
four functions in `index.ts` are the seam to extract an interface from, and that is the moment to
do it, not before.

If the render tree ever needs content that only exists inside a request (a personalised agenda, a
signed-in attendee), this boundary stays but grows a second entry point rather than being
abandoned.
