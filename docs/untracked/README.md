# Untracked working notes

Everything in this directory is ignored by git except this file.

It exists so that working material has an obvious home inside the repository instead of being
scattered across the filesystem or, worse, committed by accident.

**Suitable here:** scratch notes, dataset exports, screenshots, Lighthouse reports, webhook
payloads captured while debugging, throwaway scripts, and anything else that helped produce the
work but is not the work.

**Not suitable here:** secrets and API tokens — those belong in `.env.local`, which is also
ignored, so that there is exactly one place to look when rotating them. Nor anything another
contributor would need in order to reproduce the project; if it is required, it belongs in a
tracked file.

Nothing in here is a source of truth. Anything that turns out to matter gets promoted into
`docs/` and committed.
