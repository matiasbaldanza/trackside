# ADR-0003: Split validation by severity, not by importance

- **Status:** Accepted
- **Date:** 2026-08-01

## Context

Two people edit this content, and they want opposite things from validation.

The **programme editor** builds the schedule over weeks, at a desk, with time to fix what they get
wrong. They want the system to stop them. Discovering in September that two talks were booked into
one room in July is expensive; being blocked in July is cheap.

The **event operator** is a volunteer with a phone, standing in a corridor, marking a keynote
fifteen minutes late while somebody asks them where the toilets are. They have seconds. Anything
that stands between them and a published status change is, at that moment, a fault in the system.

Both edit the same document type. A single notion of "invalid" cannot serve them: rules strict
enough for the first will block the second, and rules loose enough for the second will let the
first ship an impossible schedule.

The tempting split is by importance — important things block, trivial things warn. That reasoning
fails immediately. A missing speaker biography is genuinely important; the programme is not
finished without it. But blocking a room change at 09:40 because a speaker on an unrelated session
has no biography is indefensible.

## Decision

Validation is split by **whether the described programme could exist**, not by how much the problem
matters.

**Errors block publishing.** They describe a state that is impossible or actively misleading to an
attendee:

- Two sessions in one room at overlapping times.
- A session outside the conference's dates.
- A workshop with no capacity or no sign-up URL — attendees are shown a thing they cannot do.
- A break or registration slot with speakers attached.
- A delay with no number of minutes, or a move with no destination room.
- Missing title, slug, room, start, or duration.

**Warnings never block.** They describe a programme that is unfinished:

- A speaker booked into two overlapping sessions.
- A session with no speakers yet.
- A missing portrait, biography, or abstract.

The test for a new rule is a single question: **if this were published as it stands, would the
schedule be wrong, or merely incomplete?** Wrong is an error. Incomplete is a warning.

## Alternatives considered

**Everything an error.** For: no invalid content can ever be published, so the frontend can trust
its data completely and skip defensive rendering. Against: it makes the Studio unusable for
incremental work. A programme is built over weeks and is incomplete for almost all of that time;
requiring completeness at every save means editors cannot save. It also fails the operator
outright — the person with the least time gets the most obstruction.

**Everything a warning.** For: nobody is ever blocked, and the fastest possible edit path for the
operator. Against: it moves every guarantee into the frontend. The overlap rule stops being a
property of the content and becomes a rendering problem, which is exactly the inversion this
project argues against — the schema should make the impossible impossible, not leave the frontend
to cope.

**Different rules for different roles.** For: precisely targets the actual tension, since the
conflict is between people rather than between fields. Against: Sanity's validation runs against
the document, not the actor, so this would mean either a separate document type for live edits or
custom logic reading the current user's role inside validation. Both make the rules harder to
predict — the same document would be valid or not depending on who was looking — and role-aware
validation is a poor substitute for rules that are correct for everybody.

**Splitting by importance.** Rejected in *Context* above: it produces exactly the outcome the
design is trying to avoid.

## Consequences

- The operator's path is never blocked by editorial incompleteness. A room change publishes even
  when half the programme has no biographies.
- The frontend can rely on structural guarantees — every published session has a room, a start, a
  duration, and no overlapping neighbour — and must still handle missing biographies, portraits
  and abstracts, because those are warnings and warnings ship.
- Warnings must stay few and meaningful. A Studio that always shows warnings has trained its
  editors to ignore them, at which point the category is worthless.
- The overlap rule queries sibling documents, so it is asynchronous and costs a request per
  validation pass. Acceptable for a programme of tens of sessions per room; at a much larger scale
  the fix is a denormalised end time, not a weaker rule.
- Error messages name the conflicting session rather than reporting that a conflict exists. An
  editor should not have to search for what they collided with.

## Revisiting

Reopen if operators are still being blocked in practice, if the warning list grows to the point
where editors stop reading it, or if Sanity gains role-aware validation that would make the third
alternative workable.
