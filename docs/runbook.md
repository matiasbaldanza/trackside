# Runbook

Operational procedures. Each one states what it changes and how to confirm it worked.

> **Outline.** Procedures are written after being executed. Anything listed but not yet run is
> marked **unverified** — a runbook that has never been followed is a guess.

## 1. Provisioning a Sanity project

> **Verified 2026-07-31**, except where noted per step.

Sanity's Content Lake is a managed service — there is no self-hosted equivalent — so the project
must be created in Sanity's console before anything in this repository can read or write content.

**Requires:** a Sanity account.

### 1.1 Create the project

At [sanity.io/manage](https://www.sanity.io/manage), create a new project:

| Field | Value |
| --- | --- |
| Project name | `trackside` |
| Dataset name | `production` |
| Visibility | **Public** |

Public visibility is not a compromise made for convenience. It is what lets a reader clone this
repository and run it against real content without an account or a token, and it does not expose
drafts: the Content Lake keeps any document whose `_id` contains a dot private regardless of
dataset visibility, and every draft is stored as `drafts.<id>`. Reading unpublished content still
requires authentication.

### 1.2 Stay inside the Free plan's limits

New projects begin on a 30-day Growth trial, which offers private datasets, more webhooks, and
additional seats. **This project deliberately uses none of that**, because when the trial lapses
the project falls back to Free and anything built on a trial-only capability would break at that
point — a month after it was written, with no obvious cause.

The constraints this project holds itself to, which are the Free plan's:

| | Free plan | Used here |
| --- | --- | --- |
| Datasets | 2, public only | 1 (`production`) |
| Documents | 10,000 | ~60 |
| GROQ webhooks | 2 | 1 |
| API requests | 250k/month + 1M CDN | Well within |
| Assets | 100 GB | Speaker portraits only |

The second dataset is left unallocated. A `development` dataset is worth creating only once there
is content worth not disturbing.

### 1.3 Ignore the "Getting started" scaffolding

The console's guided setup creates a monorepo with the Studio and the web application in separate
folders, and its agent prompt advises keeping the Studio standalone. That arrangement is a
reasonable default and it is not the one used here — see
[ADR-0001](./decisions/0001-embed-sanity-studio-in-the-next-application.md), which records why,
and what the vendor's default is optimising for that this project is not.

Running those commands against an existing repository would nest a second application inside it.

### 1.4 Record the project ID

Copy the project ID from the project's dashboard — an eight-character string, not the project name.

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SANITY_PROJECT_ID` in `.env.local` to that value.

The project ID is not a secret and is exposed to the browser by design. **Read access is bounded by
dataset visibility alone.** Because this dataset is public, anyone with the project ID can query it
directly over HTTP — step 1.5 does exactly that. CORS, configured in step 3, restricts which
browser origins may make requests from a page; it does not restrict the API and is not a
data-access control.

### 1.5 Confirm the dataset is readable without credentials

This is the property the whole local-development story rests on, so check it rather than assume it:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://<projectId>.api.sanity.io/v2026-07-31/data/query/production?query=*%5B0%5D%7B_id%7D"
```

`200` means published content reads without a token. `401` means the dataset is private — change
its visibility to public under **Datasets**, or the reproduction steps in the README will not work
for anyone but you.

---

## 2. Tokens

Most operations here need no token at all.

**Reading published content** needs nothing — the dataset is public.

**Writing content** — seeding, dataset export, content migrations — authenticates the signed-in
developer through the CLI. One step, once per machine:

```bash
pnpm exec sanity login
```

**There is deliberately no write token.** One would sit unused in an environment file, which is a
liability with nothing to show for it. If a non-interactive context ever needs to write —
continuous integration seeding a preview dataset, say — that is the point at which to create one,
and to record why here.

**Reading unpublished drafts** for preview is the only case that needs a token, because it runs on
a deployed server where no developer is signed in. Create it under **API → Tokens**, or:

```bash
pnpm exec sanity tokens create "trackside preview" --role viewer
```

On the Free plan the available roles are `viewer`, `editor` and `deploy-studio`. This one is
`viewer`: it reads drafts, and it must not be able to write.

| Token | Role | Purpose | Lives in |
| --- | --- | --- | --- |
| `trackside preview` | `viewer` | Reading drafts for preview | `.env.local` as `SANITY_API_READ_TOKEN`, and the deployment's environment |

**The token value is shown once.** If it is lost, revoke it and create another; there is no way to
read it back.

It is never exposed to the browser: it is read only in server code, and does not carry the
`NEXT_PUBLIC_` prefix — that prefix is what determines whether Next.js inlines a value into the
client bundle, so the naming is the safeguard, not a convention.

**Rotation:** create the replacement first, update `.env.local` and the deployment environment,
confirm the system still works, and only then revoke the old one. Revoking first causes an outage
for as long as a deploy takes.

---

## 3. Cross-origin configuration

> **Verified 2026-07-31.** Both the failure mode and the fix were observed.

A browser calling the Content Lake from a page is subject to CORS, so every origin that hosts the
Studio or makes browser-side requests must be registered. The public schedule is unaffected — it
reads content on the server — so this applies to the Studio alone.

**Symptom when it is missing:** the Studio loads and renders, then shows *"Connect this Studio to
your project — this Studio isn't connected to your project yet"* with an **Add CORS origin**
button. Using that button is the quickest fix: it registers the current origin against the project
you are signed in to, without leaving the page.

To do it from the console instead, under **API → CORS origins**, add:

| Origin | Allow credentials | Why |
| --- | --- | --- |
| `http://localhost:3000` | **Yes** | The embedded Studio authenticates as the logged-in user |
| The production deployment URL | **Yes** | Same, for the deployed Studio |

**Allow credentials** permits a matching origin to send authenticated requests using a logged-in
visitor's session. The Studio needs it. Anything that only reads published content does not.

Do not add a wildcard origin with credentials allowed. `http://localhost:*` is a convenience that
matches every port on the machine, and a wildcard over a shared hosting domain would let any site
on that domain make authenticated requests against this project.

Vercel preview deployments have per-commit URLs, which cannot be registered individually. Either
register a stable preview alias, or accept that the Studio is reachable only from localhost and
production — the public schedule itself is unaffected, because it is rendered on the server.

**Verify:** loading `/studio` shows the Studio rather than a network error in the console.

## 4. Seeding content

> **Verified 2026-08-01.**

```bash
pnpm exec sanity login   # once per machine
pnpm seed
```

Loads one event, four rooms, 18 speakers and 26 sessions into the dataset named by
`NEXT_PUBLIC_SANITY_DATASET` in `.env.local`. To target a different dataset, change that value —
the script deliberately has no dataset argument of its own, so there is one place that decides
which dataset a command touches.

**Idempotent.** Documents have stable ids derived from their slugs and are written with
`createOrReplace`, so a second run replaces rather than duplicates. It is also a single
transaction: a partially seeded conference is worse than an empty one, because references dangle
and the schedule renders half an event.

**Verify** — and check the public API, not only the Studio. The Studio is authenticated and will
happily show documents that no unauthenticated reader can see:

```bash
source .env.local
curl -s --get "https://$NEXT_PUBLIC_SANITY_PROJECT_ID.api.sanity.io/v2026-07-31/data/query/$NEXT_PUBLIC_SANITY_DATASET" \
  --data-urlencode 'query=count(*[_type=="session"])'
```

This must return 26. If it returns 0 while the Studio looks complete, the documents have ids
containing a dot — see the note below.

`/studio` should list 26 sessions across two days with no validation errors. Some speakers will
show a warning for a missing portrait or biography; that is intended, and is what the warning
severity exists to express.

### Document ids must not contain a dot

The Content Lake treats any document whose `_id` contains a dot as private, regardless of dataset
visibility. That is the mechanism keeping `drafts.*` unreadable on a public dataset, and it applies
to every id, not only drafts.

The first seeded programme used ids like `session.keynote`. Seeding reported success, all 49
documents were written, the Studio showed the full conference — and the public API returned
nothing. The failure is completely silent from an authenticated seat. Fixture ids now use hyphens,
and a test enforces it.

## 4a. Resetting the programme

> **Verified 2026-08-01.** Dry run and real run both executed.

Seeding only writes. It replaces the documents in the fixture set and leaves everything else
alone, so a session deleted from the fixtures, or a draft created by editing in the Studio, will
still be there afterwards. Resetting removes the fixture-managed documents first.

```bash
pnpm content:export                   # required first -- this is the only rollback
pnpm content:reset                    # dry run: reports, changes nothing
pnpm content:reset -- --no-dry-run    # actually does it
```

**Dry run is the default**, mirroring `sanity migrations run`. A destructive command whose default
is to destroy will eventually be run by accident, and matching a convention the project already
uses is one fewer thing to remember.

The dry run reports what would go, including how many are drafts:

```text
6rj0xvsm/production
  would delete : 50 documents (1 drafts)
  would write  : 1 event · 4 rooms · 18 speakers · 26 sessions
  types touched: event, track, speaker, session
```

Drafts are included deliberately. Deleting only published documents leaves `drafts.*` counterparts
behind, and they reappear in the Studio as unpublished edits to documents that no longer exist.

Only `event`, `track`, `speaker` and `session` are touched. Nothing else in the dataset is
affected, which is why this is preferable to deleting and recreating the dataset.

**Verify** against the public API, not the Studio — the Studio is authenticated and cannot show
this class of failure:

```bash
source .env.local
curl -s --get "https://$NEXT_PUBLIC_SANITY_PROJECT_ID.api.sanity.io/v2026-07-31/data/query/$NEXT_PUBLIC_SANITY_DATASET" \
  --data-urlencode 'query=count(*[_type=="session"])'
```

Expect `26`.

### Doing it by hand

If the script is unavailable or you want to see each step:

```bash
source .env.local

pnpm exec sanity documents query '*[_type in ["event","track","speaker","session"]]._id' \
  --api-version 2026-07-31 --dataset "$NEXT_PUBLIC_SANITY_DATASET" \
  | sed -n '/^\[/,$p' \
  | python3 -c "import sys,json;print('\n'.join(json.load(sys.stdin)))" \
  | xargs -n 10 ./node_modules/.bin/sanity documents delete --dataset "$NEXT_PUBLIC_SANITY_DATASET"

pnpm seed
```

**Read the dataset from `.env.local` rather than typing it.** Every content script resolves it the
same way, and a literal dataset name in a delete command is how you eventually verify one dataset
having emptied another.

Two things that are not obvious:

- **`--api-version` is required on `query`.** Without it the CLI prints a warning line to stdout
  that breaks JSON parsing.
- **`xargs -n 10` is not optional.** Passing every id as a single shell word makes the CLI treat
  the whole string as one document id and reject it.

### Starting the dataset over completely

Heavier, and it discards document history along with the content:

```bash
source .env.local
pnpm exec sanity dataset delete "$NEXT_PUBLIC_SANITY_DATASET"
pnpm exec sanity dataset create "$NEXT_PUBLIC_SANITY_DATASET" --visibility public
pnpm seed
```

CORS origins are configured per project, so they survive. **`--visibility public` is not
optional** — a private dataset breaks anonymous reads, and the symptom is identical to the
dotted-id failure above: the Studio looks complete, the public API returns nothing.

---

## 5. Backup and restore

> **Export verified 2026-08-01. Restore unverified** — the export has not yet been imported back.

```bash
pnpm content:export      # writes exports/production-<timestamp>.tar.gz
```

The `exports/` directory is ignored by git. A dataset export is a full copy of the content,
including anything unpublished, so it belongs on disk rather than in the repository.

Restoring:

```bash
pnpm exec sanity dataset import exports/<file>.tar.gz production --replace
```

**An export is required before any content migration that is not a dry run**, and before any bulk
delete. Content migrations are not reliably invertible; restore is the rollback.

This was used in earnest during Milestone 3: 48 documents with unusable ids had to be removed, and
the export taken beforehand made the deletion reversible rather than final.

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
