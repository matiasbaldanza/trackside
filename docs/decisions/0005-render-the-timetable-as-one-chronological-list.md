# ADR-0005: Render the timetable as one chronological list, laid out two ways

- **Status:** Accepted
- **Date:** 2026-08-01

## Context

A multi-track timetable is a two-dimensional object: time runs down, rooms run across, and the
whole value of the grid is that a reader can see what is on at 11:00 in all four rooms at once.
Nothing about that survives a phone screen. Four columns at 375px gives each session about 80
pixels of width, which fits neither a title nor a speaker's name, and the comparison the grid
exists for becomes impossible anyway once three of the four columns are off-screen.

So the schedule needs two presentations: a grid on a wide screen, and a chronological agenda on a
narrow one. The question is what produces them.

There is a second requirement pulling on the same decision. The grid's meaning is spatial, and
spatial meaning does not survive being read aloud. Whatever markup produces the grid also has to
produce a sequence that makes sense to someone who receives it one element at a time — and "makes
sense" here is specific: a screen-reader user should be able to move through a day in the order the
day happens.

The two requirements interact. Any structure that groups by room to build columns produces a
reading order of *all of Auditorio, then all of Sala Norte* — which is a linear order, but not one
that answers "what is on next".

## Decision

The document contains **one ordered list per day, in chronological order**, and two layouts over
it.

- Each `<li>` carries an inline `grid-row` and `grid-column` computed by `layOutDay` in
  `src/lib/schedule/layout.ts`. Rows are five minutes tall, so a ninety-minute workshop is visibly
  three times a thirty-minute talk; the column is the room.
- Above `lg`, the list is `display: grid` and the placements take effect.
- Below `lg`, the list is `display: flex; flex-direction: column`, the grid properties are inert,
  and the same elements stack in the order they are already in.

The time axis, the hour rules and the room headers are a separate `aria-hidden` layer. They are
decoration in the strict sense: every fact they carry is already on the cards.

Because the room headers are not in the accessibility tree, `SessionCard` keeps the room name in
the tree at every breakpoint, hiding it visually only above `lg` where a column header is doing
the job.

## Alternatives considered

**Per-track lists arranged into a grid.** One `<ol>` per room, each a column, joined by a grid
container.
*For:* the columns are real in the markup, so a room header can head a real group and the visual
structure and the document structure agree. It is the shape most people reach for.
*Against:* the reading order becomes room-major. A screen-reader user asking what happens after the
keynote gets the rest of the Auditorio's day first — twelve sessions — before reaching the parallel
talk that started five minutes later. It also cannot produce the mobile agenda without either
re-grouping the data into a second tree or asking the reader to scroll through one room at a time.

**An HTML `<table>`.** Rows are time slots, columns are rooms.
*For:* a genuine two-dimensional relationship, and screen readers can navigate it cell by cell with
row and column headers announced.
*Against:* it only works if the grid is actually a grid — every session occupying whole slots of
equal length. Real programmes are not like that. A 40-minute talk against a 90-minute workshop
against a 15-minute break needs `rowspan` arithmetic over a lowest-common-denominator slot size,
and one session starting five minutes off the grid subdivides every row in the table. The
structure would be describing the layout rather than the content.

**Two component trees, one hidden per breakpoint.** Render a grid and an agenda, and use
`display: none` on whichever does not apply.
*For:* each layout is written directly, with no constraint from the other, and `display: none`
does keep the hidden copy out of the accessibility tree.
*Against:* every session is in the document twice. The payload doubles for the LCP route; any
change to a card has to be made in two places or extracted into a component whose props then have
to satisfy both; and it is permanently possible for the two to disagree about what the schedule
says. The saving is convenience for the author, paid for by the reader.

**A grid-template-areas layout driven by generated CSS.** Same DOM, but placement expressed as
named areas in a stylesheet.
*For:* no inline styles.
*Against:* the CSS has to be generated per day from the content anyway, so it is the same
computation moved somewhere less inspectable, plus a `<style>` block whose size grows with the
programme.

## Consequences

The layout arithmetic is a pure function with tests, not a component detail. `layOutDay` works in
minutes since local midnight at the venue rather than in UTC offsets — a grid derived from UTC is
correct only where the venue's offset is a whole number of hours and is silently half an hour out
in Kolkata or Adelaide. That is covered by a test.

One card component serves both layouts, so there is exactly one description of what a session
looks like.

The costs, plainly:

- **Room headers are invisible to assistive technology.** A screen-reader user gets the room from
  each card, which is more words per session than a column header would have been. This is a
  deliberate trade of terseness for a reading order that matches the day.
- **Inline styles on every list item.** They are computed values that change per session and per
  day, which is what inline styles are for, but they cannot be overridden by a stylesheet and they
  add bytes to the HTML.
- **The grid is only proportional within a day.** The axis is derived from that day's earliest and
  latest sessions, so two days with different spans render at different scales. Fixing the axis
  across days would spend screen height on hours nothing is happening in.
- **A session running past midnight is clamped to the bottom of the grid** rather than continuing
  onto the next day's. Also covered by a test, so the behaviour is chosen rather than emergent.

## Revisiting

If the programme grows past roughly six parallel rooms, columns become too narrow to read on a
laptop and the grid needs horizontal scrolling or a room filter as a precondition rather than a
convenience.

If sessions ever need to be reordered or rescheduled by dragging, this is the wrong structure: a
direct-manipulation editor wants a coordinate space it owns, not a document order with layout
hints. That would be a Studio feature, and it would be built there.
