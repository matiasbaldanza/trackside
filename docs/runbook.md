# Runbook

Operational procedures. Each one states what it changes and how to confirm it worked.

> **Outline.** Procedures are written after being executed. Anything listed but not yet run is
> marked **unverified** — a runbook that has never been followed is a guess.

## 1. Provisioning a Sanity project

_Unverified — Milestone 1._ Creating the project, choosing datasets, and recording the project
identifier.

## 2. Tokens

_Unverified — Milestone 1._ Which tokens exist, what each is for, where each lives, which must
never reach the browser, and how to rotate one.

## 3. Cross-origin configuration

_Unverified — Milestone 1._ The origins that must be registered, including preview deployments.
Historically the most common first-run failure.

## 4. Seeding content

_Unverified — Milestone 3._ Loading fixture content into a dataset, and targeting a dataset other
than the default.

## 5. Backup and restore

_Unverified — Milestone 3._ Exporting a dataset with its assets, and restoring one.

**An export is required before any content migration that is not a dry run.** Content migrations
are not reliably invertible; restore is the rollback.

## 6. Changing the schema

_Unverified — Milestone 2._ Extracting the schema, regenerating types, and committing both.
Continuous integration fails if the generated files do not match the schema.

## 7. Running a content migration

_Unverified — Milestone 5._ Creating a migration, reviewing its dry run, taking an export, and
applying it.

The Content Lake is schemaless: changing a field in the schema does not change documents that were
already stored. Migrations exist to close that gap, and the gap is silent until something reads the
old shape.

## 8. Configuring the invalidation webhook

_Unverified — Milestone 5._ The filter, the target, the shared secret, confirming delivery, and
replaying a failed delivery.

## 9. Deployment

_Unverified — Milestone 7._ Environment variables per environment, and how preview deployments
differ from production.

## 10. Incidents

_Unverified — Milestone 7._

- The public schedule is showing stale content.
- The webhook is not firing.
- A migration was applied in error.
- A token has been exposed.
