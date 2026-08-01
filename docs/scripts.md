# Scripts

Every `pnpm` script in this repository, what it does, and what it costs to run.

This is the canonical list. `AGENTS.md` and `README.md` point here rather than repeating it —
two copies of the same table drift, and a reader cannot tell which is authoritative.

**Legend**

| | Meaning |
| --- | --- |
| 🟢 | Safe. Reads, or writes only build output. |
| 🟡 | Writes files you will see — tracked sources, or archives on disk. |
| 🔴 | Writes to the dataset. Affects content other people can see. |
| 🔑 | Requires `pnpm exec sanity login` — once per machine. |

---

## Development

| Script | | What it does |
| --- | --- | --- |
| `pnpm dev` | 🟢 | Serves the application on `http://localhost:3000` and Sanity Studio on `/studio`. |
| `pnpm build` | 🟢 | Production build. |
| `pnpm start` | 🟢 | Serves a build produced by `pnpm build`. |
| `pnpm test:watch` | 🟢 | Unit tests, watching. Long-running, so it belongs here rather than with the checks that run in CI. |

## Checks

Everything here runs in continuous integration. All of it should pass before a pull request.

| Script | | What it does |
| --- | --- | --- |
| `pnpm typecheck` | 🟢 | `tsc --noEmit`. |
| `pnpm lint` | 🟢 | ESLint. |
| `pnpm test` | 🟢 | Unit tests, once. |
| `pnpm schema:check` | 🟡 | Regenerates `schema.json` and `sanity.types.ts` and **fails if either differs from what is committed**. This is what stops a schema change from silently failing to propagate. It stages nothing permanently, but it does rewrite the two generated files. |

## Schema and types

Both generated artefacts are committed, so a change that was not propagated fails a check rather
than drifting. See [architecture.md](./architecture.md).

| Script | | What it does |
| --- | --- | --- |
| `pnpm schema:extract` | 🟡 | Writes `schema.json` from the Studio schema. `--force` overwrites; without it the command refuses and the check is not repeatable. |
| `pnpm types:generate` | 🟡 | Writes `sanity.types.ts` from `schema.json`. Run after `schema:extract`, never before. |

**Commit both.** They are outputs, but they are the contract the application reads.

## Content

These touch the dataset. Read [runbook §4, §4a and §5](./runbook.md) before using them in anger.

| Script | | What it does |
| --- | --- | --- |
| `pnpm seed` | 🔴 🔑 | Writes the Nodo Conf fixture programme — 49 documents — into the dataset named by `NEXT_PUBLIC_SANITY_DATASET`. Idempotent: stable ids and `createOrReplace`, one transaction. **Only writes.** Documents no longer in the fixture set, and drafts, survive. |
| `pnpm content:export` | 🟡 🔑 | Archives the dataset named in `.env.local`, with its assets, to `exports/<dataset>-<timestamp>.tar.gz`, which is git-ignored. **Required before any reset or non-dry-run migration** — it is the only rollback there is. Wrapped in `scripts/export.sh`, which reads `.env.local` itself and checks the archive exists afterwards. |
| `pnpm content:reset` | 🔴 🔑 | **Dry run by default.** Reports how many documents would be deleted, including drafts, and changes nothing. Add `-- --no-dry-run` to delete the four fixture-managed types and write the programme again. |

```bash
pnpm content:export                   # first, always
pnpm content:reset                    # look at what it would do
pnpm content:reset -- --no-dry-run    # then do it
```

## Content migrations

The Content Lake is schemaless: changing a field in the schema does **not** change documents
already stored. Migrations exist to close that gap, and the gap is silent until something reads
the old shape. See [runbook §7](./runbook.md).

| Script | | What it does |
| --- | --- | --- |
| `pnpm migration:create` | 🟡 | Scaffolds a migration under `migrations/`. |
| `pnpm migration:run <id>` | 🔴 🔑 | **Dry run by default**, printing the patches and document ids it would apply. Add `-- --no-dry-run` to write. |

---

## Two conventions worth knowing

**Anything destructive dries-run by default.** Both `content:reset` and `migration:run` report and
exit unless given `--no-dry-run`. A destructive command whose default is to destroy will
eventually be run by accident. `migration:run` is Sanity's own behaviour; `content:reset` matches
it deliberately, so there is one rule rather than two.

**Verify content changes against the public API, not the Studio.** The Studio is authenticated and
cannot show you a whole class of failure — documents that exist but are unreadable to anyone
without credentials.

```bash
source .env.local
curl -s --get "https://$NEXT_PUBLIC_SANITY_PROJECT_ID.api.sanity.io/v2026-07-31/data/query/$NEXT_PUBLIC_SANITY_DATASET" \
  --data-urlencode 'query=count(*[_type=="session"])'
```

The dataset comes from `.env.local`, the same place every content script reads it from. Hard-coding
a dataset name in a verification command means eventually verifying one dataset and having changed
another.

This is not hypothetical. A seeding run once reported complete success, wrote all 49 documents, and
produced a dataset the public could not read at all — because the ids contained dots. The Studio
looked perfect throughout. [runbook §4](./runbook.md) has the detail.
