# Untracked working notes

Everything in this directory is ignored by git except this file.

It exists so that working material has an obvious home inside the repository instead of being
scattered across the filesystem or, worse, committed by accident.

**Suitable here:** scratch notes, dataset exports, screenshots, Lighthouse reports, webhook
payloads captured while debugging, throwaway scripts, and anything else that helped produce the
work but is not the work.

**Not suitable here:**

- Secrets and API tokens. Those belong in `.env.local`, which is also ignored, so that there is
  exactly one place to look when rotating them.
- Personal data, request signatures, or authentication headers. Redact them **before** the file is
  written, not afterwards — being ignored by git protects the repository, not the disk it is on,
  and not any backup that disk is part of.
- Anything another contributor would need in order to reproduce the project. If it is required, it
  belongs in a tracked file.

Delete captured material once it has served its purpose. A debugging artefact kept indefinitely is
a copy of production content with no owner and no retention policy.

Nothing in here is a source of truth. Anything that turns out to matter gets promoted into
`docs/` and committed.
