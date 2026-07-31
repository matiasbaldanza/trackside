# Testing

> **Outline.** Filled in as tests are written. **No check is described here as passing unless it
> has actually been run**, and results are recorded as measured.

## What is worth testing here

_To be written._ The reasoning behind the split below: where bugs in this system would actually
come from, and which of those are worth catching automatically.

## Automated

### Unit — scheduling logic
_Milestone 2._ Overlap detection, end-time derivation, and timezone conversion. These are pure
functions precisely so they can be tested without booting a Studio, which is what makes validation
rules verifiable at all.

### Unit — query result transformation
_Milestone 4._ Mapping query results into the view models the components consume.

### End to end
_Milestone 6._ One journey: open the schedule, change day, filter by room, switch to viewer-local
time, open a session.

### Accessibility
_Milestone 6._ Automated checks over the schedule and session detail routes, run alongside the
end-to-end journey.

### Continuous integration
_Milestone 7._ Type checking, linting, a production build, generated-artefact freshness, and the
test suites above.

## Verified by hand

Some behaviour is not worth automating here, and pretending otherwise would produce tests that
assert the implementation rather than the behaviour. These are checked manually and the results
recorded:

- Studio validation as an editor experiences it — whether the message explains the conflict.
- The live operations pane and the status action, on a phone.
- Webhook delivery and cache invalidation end to end, against the deployed site.
- A screen-reader pass over the timetable.
- A real-handset pass on the mobile layout.

## Results

_Recorded here as checks are run._
