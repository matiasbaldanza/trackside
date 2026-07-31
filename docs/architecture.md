# Architecture

> **Outline.** Sections are written as the corresponding work lands, so that this document
> describes the system that exists rather than the one that was intended. Empty sections are
> listed deliberately — a gap here means the work has not been done, not that it was forgotten.

## System shape

_To be written in Milestone 1._ The Next.js application, the embedded Studio, and Sanity's hosted
Content Lake; what runs where, and what crosses the network.

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
