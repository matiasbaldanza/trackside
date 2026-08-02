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
| [0002](./0002-store-a-start-instant-and-a-duration.md) | Store a start instant and a duration, and derive conference days | Accepted | 2026-08-01 |
| [0003](./0003-split-validation-by-severity.md) | Split validation by severity, not by importance | Accepted | 2026-08-01 |
| [0004](./0004-derive-fixture-document-ids-from-slugs.md) | Derive fixture document ids from slugs | Accepted | 2026-08-01 |
| [0005](./0005-render-the-timetable-as-one-chronological-list.md) | Render the timetable as one chronological list, laid out two ways | Accepted | 2026-08-01 |
| [0006](./0006-confine-sanity-access-to-one-directory.md) | Confine Sanity access to one directory, behind view models | Accepted | 2026-08-02 |

## Decisions expected but not yet made

Listed so the gaps are visible rather than accidental. Each is written when the corresponding work
begins — recording a decision before it has been confronted in code produces a plausible document
and an unreliable one.

- How content freshness is achieved, given that session status changes during an event while
  speaker biographies do not.
