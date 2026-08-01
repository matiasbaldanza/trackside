#!/bin/sh
# Archive the configured dataset to exports/<dataset>-<timestamp>.tar.gz
#
# A wrapper exists because the dataset name lives in .env.local, and a
# package.json script is expanded by the shell before any of that is loaded.
# Referencing $NEXT_PUBLIC_SANITY_DATASET there expands to an empty string,
# and `sanity dataset export ""` does not fail -- it reports success and
# writes nothing, which is the worst available outcome for a backup command.
#
# The Sanity CLI loads .env.local into its own process, which is why `pnpm
# seed` works without this. Shell expansion does not.
set -eu

# An export contains every document in the dataset, drafts included. Written
# with a typical 022 umask it would be world-readable, which on a shared or
# backed-up machine is a copy of unpublished content with no access control.
# 077 applies to the directory and the archive alike.
umask 077

if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi

DATASET="${NEXT_PUBLIC_SANITY_DATASET:-}"
if [ -z "$DATASET" ]; then
  echo "NEXT_PUBLIC_SANITY_DATASET is not set. Copy .env.example to .env.local." >&2
  exit 1
fi

mkdir -p exports
DESTINATION="exports/${DATASET}-$(date +%Y%m%d-%H%M%S).tar.gz"
STAGING="${DESTINATION}.partial"

cleanup() {
  rm -f "$STAGING"
}
trap cleanup EXIT INT TERM

# The local binary is invoked directly rather than through `pnpm exec`. A
# nested pnpm resolves through corepack, which may be installed under a
# different Node version than the one running the project, and fails with an
# unrelated module-loading error that says nothing about datasets.
./node_modules/.bin/sanity dataset export "$DATASET" "$STAGING"

# Written to a staging path and validated before taking its final name.
#
# The CLI reporting success is not evidence that a usable archive exists --
# that is the failure this wrapper was built for, and "a non-empty file is
# there" is only a weaker version of the same assumption. An interrupted or
# truncated export leaves a file of plausible size that cannot be read, and
# the moment to discover that is now rather than during a restore.
if [ ! -s "$STAGING" ]; then
  echo "Export reported success but wrote no archive." >&2
  exit 1
fi

if ! tar -tzf "$STAGING" >/dev/null 2>&1; then
  echo "Export produced an unreadable archive; it has been discarded." >&2
  exit 1
fi

mv "$STAGING" "$DESTINATION"
echo "Wrote $DESTINATION ($(tar -tzf "$DESTINATION" | wc -l | tr -d ' ') entries)"
