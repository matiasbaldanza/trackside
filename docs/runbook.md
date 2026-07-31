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

The project ID is not a secret. It is exposed to the browser by design, and reaching content with
it is bounded by dataset visibility and CORS — see step 3.

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

> **Unverified.** Not yet executed.

Reading published content needs no token. Tokens are needed for two things: writing content
(seeding, content migrations) and reading unpublished drafts (preview).

Create tokens under **API → Tokens** in the project console, or from the CLI:

```bash
pnpm dlx sanity@latest tokens create "trackside seed" --role editor
pnpm dlx sanity@latest tokens create "trackside preview" --role viewer
```

On the Free plan the available roles are `viewer`, `editor`, and `deploy-studio`.

| Token | Role | Purpose | Lives in |
| --- | --- | --- | --- |
| `trackside seed` | `editor` | Seeding, exports, content migrations | `.env.local` as `SANITY_API_WRITE_TOKEN` |
| `trackside preview` | `viewer` | Reading drafts for preview | `.env.local` as `SANITY_API_READ_TOKEN`, and the deployment's environment |

**The token value is shown once.** If it is lost, revoke it and create another; there is no way to
read it back.

Neither token is ever exposed to the browser. Both are read only in server code, and neither
carries the `NEXT_PUBLIC_` prefix — that prefix is what determines whether Next.js inlines a value
into the client bundle, so the naming is the safeguard, not a convention.

**Rotation:** create the replacement first, update `.env.local` and the deployment environment,
confirm the system still works, and only then revoke the old token. Revoking first causes an
outage for the time it takes to deploy.

**Verify:** a token works if `pnpm seed` writes successfully (once that script exists — Milestone
3).

---

## 3. Cross-origin configuration

> **Partially verified 2026-07-31.** The failure mode below was observed; the fix has not yet been
> applied.

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
