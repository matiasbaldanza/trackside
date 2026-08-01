# trackside

A conference programme and run-of-show system, built with Sanity and Next.js.

A multi-track conference publishes its programme. Attendees browse it in their own timezone.
Operators update it while the event is running — when a session slips, moves room, or is cancelled
— and those changes reach the public schedule within seconds.

Seeded content describes **Nodo Conf**, a fictional two-day conference in Buenos Aires.

---

## Current state

**Milestone 2 — Content model, in progress.**

What works today:

- A Next.js 16 application (App Router, React 19, TypeScript, Tailwind 4) serving an empty page.
- Sanity Studio at `/studio`, with the full conference content model: events, rooms, speakers and
  sessions.
- Validation that refuses an impossible programme — two sessions cannot share a room at the same
  time, and a session cannot fall outside the conference — while letting an unfinished one be
  saved and published.
- A complete fixture programme for Nodo Conf — 26 sessions across two days in four rooms — loaded
  with `pnpm seed`.
- 61 unit tests over the scheduling logic and the fixture programme.

There is no public schedule yet. It is the next milestone in
[`docs/roadmap.md`](./docs/roadmap.md).

This section is updated at every milestone and at any commit that changes what the project can do.

---

## Running it

Requires **Node 22+** and **pnpm**.

```bash
pnpm install
cp .env.example .env.local   # then set NEXT_PUBLIC_SANITY_PROJECT_ID
pnpm dev
```

- `http://localhost:3000` — the application
- `http://localhost:3000/studio` — Sanity Studio

Reading published content needs no credentials. Using the Studio requires a Sanity project and its
origin registered for CORS; both are covered in [`docs/runbook.md`](./docs/runbook.md).

---

## Documentation

| | |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | Canonical contributor and agent instructions |
| [`docs/roadmap.md`](./docs/roadmap.md) | Living roadmap — planned work and its status |
| [`docs/decisions/`](./docs/decisions/) | Architecture Decision Records |
| [`docs/architecture.md`](./docs/architecture.md) | How the system fits together, and why |
| [`docs/testing.md`](./docs/testing.md) | What is tested automatically, what is verified by hand |
| [`docs/local-development.md`](./docs/local-development.md) | Reproducing the project locally |
| [`docs/runbook.md`](./docs/runbook.md) | Operational procedures |
| [`docs/llm-use.md`](./docs/llm-use.md) | How coding agents were used |

---

## Acknowledgement

The motivating example was [Nerdearla](https://nerdear.la), a large multi-track conference in
Buenos Aires whose programme is hard to navigate on a phone. This project is not affiliated with
it, and reproduces none of its content or branding.
