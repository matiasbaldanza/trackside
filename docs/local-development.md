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

### Editing content in the Studio

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
| `SANITY_API_WRITE_TOKEN` | Server only | Seeding, export, migrations (Milestone 3) | Token with `editor` role | Throws only when those commands run |

The `NEXT_PUBLIC_` prefix is what makes Next.js inline a value into the browser bundle. It is the
mechanism, not a naming convention, which is why no token carries it. The two tokens are read
through functions rather than at module scope, so importing this module from client code cannot
pull a secret into the bundle.

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

_Not implemented — Milestone 3._

## Common failures

Recorded as they are encountered, not guessed at in advance.

**The Studio loads, then says it is not connected to a project.** The origin is not registered for
CORS. Use the **Add CORS origin** button on that screen. Observed 2026-07-31.
