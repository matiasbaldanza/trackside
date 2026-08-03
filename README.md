# trackside

A conference programme and run-of-show system, built with Sanity and Next.js.

A multi-track conference publishes its programme. Attendees browse it in their own timezone.
Operators update it while the event is running — when a session slips, moves room, or is cancelled
— and those changes reach the public schedule within seconds.

Seeded content describes **Nodo Conf**, a fictional two-day conference in Buenos Aires.

---

## Current state

**Milestones 1–4 complete. Milestone 5 — live operations — not started.**

What works today:

- **The public schedule.** A timetable with a proportional time axis and one column per room on a
  wide screen; the same sessions as a chronological agenda on a phone. One list in the document,
  laid out two ways — see [ADR-0005](./docs/decisions/0005-render-the-timetable-as-one-chronological-list.md).
- **Filtering by day and room**, as links driving the URL rather than client state, so a filtered
  view can be shared and costs no JavaScript.
- **Times in the venue's zone or the reader's own**, with the schedule rendered on the server
  either way and the viewer's zone resolved after hydration.
- **A page per session** — abstract, speakers, room, length, sign-up for workshops — prerendered
  at build time.
- **Sanity Studio at `/studio`**, with the full content model: events, rooms, speakers, sessions.
- **Validation that refuses an impossible programme** — two sessions cannot share a room at the
  same time, and a session cannot fall outside the conference — while letting an unfinished one be
  saved and published.
- **A complete fixture programme for Nodo Conf** — 26 sessions across two days in four rooms —
  loaded with `pnpm seed`.
- **144 unit tests** over scheduling, the fixture programme, the query transformation, grid
  placement, filtering and formatting.

Live status is modelled and rendered but nothing writes it yet: the operator's pane, the
publish-in-one-step action and the invalidation webhook are the next milestone in
[`docs/roadmap.md`](./docs/roadmap.md).

This section is updated at every milestone and at any commit that changes what the project can do.

---

## Live

<https://trackside-events.vercel.app>

## Running it

Requires **Node 22+** and **pnpm**.

```bash
pnpm install
cp .env.example .env.local   # then set NEXT_PUBLIC_SANITY_PROJECT_ID
pnpm dev
```

- `http://localhost:3000` — the schedule
- `http://localhost:3000/studio` — Sanity Studio

Reading published content needs no credentials. Using the Studio requires a Sanity project and its
origin registered for CORS; both are covered in [`docs/runbook.md`](./docs/runbook.md).

---

## Documentation

| | |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | Canonical contributor and agent instructions |
| [`docs/roadmap.md`](./docs/roadmap.md) | Living roadmap — planned work and its status |
| [`docs/scripts.md`](./docs/scripts.md) | Every `pnpm` script, what it writes, what it costs |
| [`docs/decisions/`](./docs/decisions/) | Architecture Decision Records |
| [`docs/architecture.md`](./docs/architecture.md) | How the system fits together, and why |
| [`docs/testing.md`](./docs/testing.md) | What is tested automatically, what is verified by hand |
| [`docs/local-development.md`](./docs/local-development.md) | Reproducing the project locally |
| [`docs/runbook.md`](./docs/runbook.md) | Operational procedures |
| [`docs/deployments.md`](./docs/deployments.md) | Where each version is deployed, and what a preview URL means |
| [`docs/llm-use.md`](./docs/llm-use.md) | How coding agents were used |

---

## Acknowledgement

The motivating example was [Nerdearla](https://nerdear.la), a large multi-track conference in
Buenos Aires whose programme is hard to navigate on a phone. This project is not affiliated with
it, and reproduces none of its content or branding.
