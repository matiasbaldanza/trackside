# ADR-0002: Store a start instant and a duration, and derive conference days

- **Status:** Accepted
- **Date:** 2026-08-01

## Context

A session occupies a span of time in a room, and the schedule has to answer three questions about
it: when does it start, when does it end, and which day is it on. How that span is stored decides
how hard each question is, and — more importantly — decides whether two stored fields can come to
disagree.

The event is hybrid, with a venue in Buenos Aires and an audience elsewhere, so "when" cannot mean
a wall-clock time without a timezone attached to it.

## Decision

A session stores **`startsAt`**, a datetime persisted as an instant in UTC, and
**`durationMinutes`**, an integer. The end time is derived and never stored.

The event document holds the **venue timezone** as an IANA identifier, and the range of dates the
conference occupies. **Conference days are derived from that range**, not modelled as documents.

## Alternatives considered

### Representing the span

**Start and end datetimes.**
For: the end time is read directly, with no arithmetic, and no code can get it wrong. Overlap
comparisons are a straight comparison of two stored values. Against: two fields describe one
fact, so they can disagree — and the failure is silent. An editor shortening a talk changes the
end time and leaves the duration stale, or moves the start and leaves the end where it was,
producing a session with a negative or absurd length that nothing rejects until someone reads the
grid. Programme committees also do not think this way: they allocate a forty-minute slot, they do
not compute that a talk beginning at 14:20 ends at 15:00.

**Start and duration. [chosen]**
For: one fact, one field pair, no possibility of internal contradiction. Duration matches how a
programme is actually built, which makes the Studio form match the editor's mental model. Moving a
session is editing one field, and its length follows. Overlap detection has a single source of
truth. Against: every consumer must compute the end, so that arithmetic has to live somewhere
shared or it will be repeated inconsistently. This is why `sanity/lib/scheduling.ts` exists and
why `endsAt` is defined there rather than inline.

**A start plus a reference to a slot document.**
For: a fixed grid of slots makes overlap structurally impossible — two sessions in one room and
one slot is a uniqueness constraint rather than a query. Against: it assumes a uniform grid.
Keynotes run long, workshops run double, breaks are irregular. Modelling the exception would mean
either slots of many lengths, which is the duration field wearing a costume, or forcing the
programme to fit the model. The constraint is real but it buys correctness by removing the
flexibility a conference actually needs.

### Representing days

**A `day` document, referenced by sessions.**
For: a day can be titled ("Workshop Day"), given its own description, and reordered. Sessions
group by a reference rather than by computing anything. Against: it introduces a second source of
truth for which day a session is on — the reference, and the timestamp — and nothing keeps them
agreeing. An editor moving a session from Friday evening to Saturday morning updates the timestamp
and leaves the reference pointing at Friday. It is one more document type to seed, maintain, and
leave orphaned.

**Derived from the event's date range. [chosen]**
For: the timestamp is the only source of truth, so a session cannot be on the wrong day. Nothing
to seed, nothing to orphan, one fewer type for an editor to understand. Against: a day cannot
carry its own content — no title, no description, no per-day hero. If that is ever needed, this
decision has to be revisited rather than extended.

## Consequences

- **Sanity stores a datetime exactly as written, and does not normalise it.** Writing
  `2026-09-24T08:30:00-03:00` through the API stores that string; the Studio's date input writes
  `Z`-suffixed UTC. GROQ compares datetime strings lexicographically unless explicitly cast, so a
  dataset holding both forms filters incorrectly — silently, and only for some rows. Everything
  that writes a session must therefore normalise to UTC at the point of writing. The fixtures do;
  the Studio already does.
- End times are computed in `sanity/lib/scheduling.ts` and nowhere else.
- Overlap detection compares computed intervals, and is unit-testable without a Studio, because
  the functions are pure.
- Instants are unambiguous, which makes viewer-local rendering a display concern rather than a
  storage one — a hybrid audience gets correct times without a second stored field.
- **The Studio shows `startsAt` in the editor's own timezone, not the venue's.** An editor working
  from another country sees times shifted from the ones the programme is planned in. The field
  description says so, which is mitigation rather than a fix; a custom input rendering venue time
  would fix it properly and has not been justified yet.
- Grouping sessions into days requires converting each instant into the venue timezone before
  comparing dates. A session at 23:30 venue time is on a different day in UTC, so any grouping
  that skips the conversion will be wrong for late sessions — quietly, and only sometimes.
- A conference day cannot have a title or a description.

## Revisiting

Reopen if conference days need their own content, if the programme moves to fixed uniform slots,
or if editors working outside the venue timezone make enough scheduling mistakes to justify a
custom input for `startsAt`.
