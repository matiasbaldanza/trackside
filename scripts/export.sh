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

pnpm exec sanity dataset export "$DATASET" "$DESTINATION"

# Confirm the archive exists. The CLI reporting success is not evidence that
# a file was written -- that is the failure this wrapper was built for.
if [ ! -s "$DESTINATION" ]; then
  echo "Export reported success but $DESTINATION is missing or empty." >&2
  exit 1
fi

echo "Wrote $DESTINATION"
