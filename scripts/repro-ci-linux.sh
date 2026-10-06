#!/usr/bin/env bash
# Reproduce the CI hang inside a Linux container.
#
# Locally `npm test` finishes in ~13s on macOS with CI=true and no TTY, so the
# failure is specific to the runner OS. This runs the same suite on Linux, with a
# clean node_modules installed inside the container (the macOS ones would carry
# wrong native binaries).
set -uo pipefail

IMAGE="${IMAGE:-node:22.6.0-bookworm}"
VOL="${VOL:-gripm-node-modules}"
REPO="$PWD"

docker volume create "$VOL" >/dev/null

echo "=== imagen: $IMAGE (node_modules cacheado en el volumen $VOL) ==="
docker run --rm \
  -v "$REPO":/src:ro \
  -v "$VOL":/nm \
  -w /work \
  "$IMAGE" bash -lc '
  set -uo pipefail
  mkdir -p /work
  tar -cf - -C /src --exclude=node_modules --exclude=.git . | tar -xf - -C /work

  if [ -d /nm/node_modules ]; then
    cp -R /nm/node_modules /work/node_modules 2>/dev/null
  else
    echo "--- npm ci (primera vez) ---"
    npm ci --no-audit --no-fund >/tmp/ci.log 2>&1 || { echo "npm ci FALLO"; tail -20 /tmp/ci.log; exit 1; }
    cp -R /work/node_modules/. /nm/node_modules/ 2>/dev/null
  fi

  echo "--- npm test ---"
  CI=true GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=echo \
    node --experimental-strip-types scripts/run-tests.js --timeout 90
  echo "SUITE_EXIT=$?"
'