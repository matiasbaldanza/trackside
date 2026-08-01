# trackside

A conference programme and run-of-show system, built with Sanity and Next.js.

A multi-track conference publishes its programme. Attendees browse it in their own timezone.
Operators update it while the event is running — when a session slips, moves room, or is cancelled
— and those changes reach the public schedule within seconds.

Seeded content describes **Nodo Conf**, a fictional two-day conference in Buenos Aires.

---

## Current state

**Milestone 1 — Foundation, in progress.**

What works today:

- A Next.js 16 application (App Router, React 19, TypeScript, Tailwind 4) serving an empty page.
- Sanity Studio, running at `/studio`, connected to a Sanity project.
- Project instructions, roadmap, and decision records.

The Studio has no schema yet, so there is nothing to edit and nothing to display. The content
model, the schedule, and everything else are in [`docs/roadmap.md`](./docs/roadmap.md).

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
