# Architecture Decision Records

Short records of decisions that were genuinely contested, written at the moment the decision was
made. Each one states what forced the choice, what was chosen, what was rejected and why, and what
the choice costs.

Records are immutable once accepted. A decision that changes gets a new record that supersedes the
old one; the original stays in place, because the reasoning that was correct at the time is part of
the history.

Use [`TEMPLATE.md`](./TEMPLATE.md) for new records.

## Index

| # | Decision | Status | Date |
| --- | --- | --- | --- |
| [0001](./0001-embed-sanity-studio-in-the-next-application.md) | Embed Sanity Studio in the Next.js application | Accepted | 2026-07-31 |

## Decisions expected but not yet made

Listed so the gaps are visible rather than accidental. Each is written when the corresponding work
begins — recording a decision before it has been confronted in code produces a plausible document
and an unreliable one.

- How sessions represent time, and whether conference days are modelled or derived.
- How validation severity is split, so that structural errors block publishing while editorial
  incompleteness does not block an operator mid-event.
- How content freshness is achieved, given that session status changes during an event while
  speaker biographies do not.
- How the timetable is expressed in markup, given that a visual grid and a coherent screen-reader
  reading order pull in different directions.
- How the boundary around the content source is drawn, so that the application does not depend on
  a specific CMS client throughout.
