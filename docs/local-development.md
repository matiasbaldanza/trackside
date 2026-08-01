# Local development

> Written as setup is actually performed, so the steps are the ones that were run rather than the
> ones that ought to work.

## Requirements

- Node 22+
- pnpm

## Two paths

There are two ways to run this project, and they need different things. The distinction matters:
one requires no account at all.

### Reading published content

Clone, install, copy the environment template, run:

```bash
pnpm install
cp .env.example .env.local   # then set NEXT_PUBLIC_SANITY_PROJECT_ID
pnpm dev
```

No Sanity account, no token. The dataset is public, so published content reads without
credentials.

There is nothing to display yet — the schedule arrives in Milestone 4 — but the application boots
and the environment is validated.

### Seeding and editing content

The Studio is served at `/studio` and **authenticates you as a signed-in Sanity user**, through a
session in your browser. It does not use an API token, and no token in `.env.local` grants access
to it.

What it needs:

1. Membership of the Sanity project (being its owner counts).
2. The origin registered as a CORS origin with credentials allowed — see
   [`runbook.md`](./runbook.md) section 3. Without it the Studio loads and then reports that it is
   not connected to a project.

API tokens are a separate mechanism entirely, used only by server-side and command-line
operations: seeding, dataset export, content migrations, and reading drafts for preview. They are
never involved in signing in to the Studio.

## Environment variables

All environment access goes through `src/lib/env.ts`, which validates on read and throws a message
naming the missing variable. The template is [`.env.example`](../.env.example).

| Variable | Visibility | Required for | Source | If missing |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Browser | Everything | Project dashboard | Throws on first read; app and Studio both fail to start |
| `NEXT_PUBLIC_SANITY_DATASET` | Browser | Everything | `production` | Throws on first read |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Browser | Everything | Pinned date, `2026-07-31` | Throws on first read |
| `SANITY_API_READ_TOKEN` | Server only | Draft preview (Milestone 5) | Token with `viewer` role | Throws only where preview is used; published content is unaffected |

The `NEXT_PUBLIC_` prefix is what makes Next.js inline a value into the browser bundle. It is the
mechanism, not a naming convention, which is why no token carries it. The read token is accessed
through a function rather than at module scope, so importing this module from client code cannot
pull a secret into the bundle.

**There is no write token.** Seeding, dataset export and content migrations run through the Sanity
CLI and authenticate the signed-in developer — `pnpm exec sanity login`, once per machine. A write
token would sit unused in an environment file, which is a liability with no benefit.

The project ID is not a secret. It is public by design, and treating it as one would be a false
comfort — anyone holding it can read a public dataset directly over HTTP, from anywhere, with no
browser involved:

```bash
curl "https://<projectId>.api.sanity.io/v2026-07-31/data/query/production?query=*%5B0%5D"
```

**Dataset visibility is what controls read access.** A public dataset is readable by anyone; a
private one requires a token. **CORS controls something different** — which browser origins may
make requests from a page — and it constrains the Studio, not the API. It is not a data-access
boundary and must not be relied on as one.

Nothing published to this dataset should be anything that cannot be public, because it is.

## Seeding content

`pnpm seed` loads the Nodo Conf fixture programme — one event, four rooms, 18 speakers and 26
sessions — into the dataset named in `.env.local`.

```bash
pnpm exec sanity login   # once per machine
pnpm seed
```

It is idempotent: documents have stable ids derived from their slugs and are written with
`createOrReplace`, so running it twice replaces rather than duplicates. A seed script that can only
be run once is a script nobody dares run.

The whole programme is written in a single transaction. A partially seeded conference is worse
than an empty one, because references dangle and the schedule renders half an event.

The fixture content is TypeScript rather than exported JSON, at `fixtures/nodo-conf.ts`, so that a
change to the programme is reviewable as a diff. It is checked against the same rules the Studio
enforces in `fixtures/nodo-conf.test.ts`, **before** anything is written.

That check has to happen here because nothing else will do it. The Content Lake does not enforce
schema validation: rules live in the Studio, and content written through the API or an import is
accepted whether it satisfies them or not. Seeding a programme that its own schema would reject
therefore succeeds silently, and the failure appears later as a Studio full of red.

## Common failures

Recorded as they are encountered, not guessed at in advance.

**The Studio loads, then says it is not connected to a project.** The origin is not registered for
CORS. Use the **Add CORS origin** button on that screen. Observed 2026-07-31.
