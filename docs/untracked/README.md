# Untracked working notes

Everything in this directory is ignored by git except this file.

It exists so that working material has an obvious home inside the repository instead of being
scattered across the filesystem or, worse, committed by accident.

**Suitable here:** scratch notes, screenshots, Lighthouse reports, throwaway scripts, and anything
else that helped produce the work but is not the work.

Dataset exports and captured webhook payloads are suitable **only after redaction**. Both routinely
carry personal data, request signatures, and authentication headers. Redact before writing the
file, not afterwards: git ignoring a path protects the repository, not the disk the file is on, and
not any backup that disk belongs to.

**Not suitable here:**

- Secrets and API tokens of any kind.
- Unredacted personal data, request signatures, or authentication headers.
- Anything another contributor would need in order to reproduce the project. If it is required, it
  belongs in a tracked file.

For local development, secrets belong in `.env.local`, which is also ignored. That is not the only
place they live — continuous integration and deployed environments use their own secret stores, and
a rotation has to reach all of them. Provisioning, storage locations, and rotation are procedures,
and procedures live in [`../runbook.md`](../runbook.md).

Delete captured material once it has served its purpose. A debugging artefact kept indefinitely is
a copy of production content with no owner and no retention policy.

Nothing in here is a source of truth. Anything that turns out to matter gets promoted into
`docs/` and committed.
