# Deployments

Where each version of this project is reachable, and what a given URL does and does not tell you.

Provisioning and verification steps are in [`docs/runbook.md`](./runbook.md) §9. The branch
conventions behind the preview URLs are in [`AGENTS.md`](../AGENTS.md).

## Production

| | |
| --- | --- |
| URL | <https://trackside-events.vercel.app> |
| Tracks | `main` |
| First deployed | 2026-08-02 |

Always the current state of `main`. This is the URL to share when someone asks to see the project.

## Milestone previews

From Milestone 4 onward each milestone keeps a permanently reachable deployment, so milestones can
be compared side by side rather than described. Each is a branch frozen at that milestone's merge
commit, which never moves again — see *Branches, tags and previews* in `AGENTS.md`.

| Milestone | Branch | Commit | URL |
| --- | --- | --- | --- |
| 4 — The public schedule | `preview/milestone-4` | `39459d8` | <https://trackside-git-preview-milestone-4-matias-baldanzas-projects.vercel.app> |

Milestones 1–3 have no preview. They produced no public interface: Milestone 1 served an empty
page, and Milestones 2–3 were the content model and the fixture programme, both visible only
inside the Studio. A URL for them would show a blank page and imply the opposite.

## What a preview URL does not tell you

**A preview freezes the code, not the content.** Every deployment reads the live Sanity dataset —
`/` is rendered per request, and session pages revalidate on a one-minute interval — so a
Milestone 4 preview opened months from now shows Milestone 4's *code* against *today's* content.

That is exactly what makes two previews comparable: the content is identical on both sides, so the
visible difference is the change being demonstrated. It is the right tool for showing Milestone 4's
scaffold styling against Milestone 4.5's art direction.

It is **not** an archive of how the site looked on a particular date, and should not be described
as one. If the content changes — a session renamed, the programme rebased onto different dates —
every preview changes with it, together.

## The Studio

`/studio` is reachable on production only. Each preview deployment is a distinct origin, and
Sanity requires an origin to be registered with credentials before the Studio can authenticate
from it. Registering a wildcard over `*.vercel.app` with credentials would let any site on that
domain make authenticated requests against this project, so it is not done. See runbook §3.

The public schedule is unaffected on every deployment, because it reads content on the server and
a visitor's browser never talks to the Content Lake.

## Resolved defect

`/sessions/<unknown-slug>` once returned HTTP **200** with the not-found page, rather than 404 — a
soft 404. Fixed in [ADR-0007](./decisions/0007-scope-the-loading-skeleton-with-a-route-group.md) by
scoping the loading skeleton to a route group, and diagnosed in runbook §9.7.

The fix is scoped to deployments that contain it. **Production and any preview built after ADR-0007
return 404**; the **frozen Milestone 4 preview still returns 200**, because it is pinned to a commit
from before the fix. That is not a regression — it is the frozen-code property from *What a preview
URL does not tell you*: a preview shows the code of its commit, and that commit had the bug.
