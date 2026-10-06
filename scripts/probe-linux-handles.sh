#!/usr/bin/env bash
# Dump the handles that keep verify-integration.js alive on Linux.
#
# node_modules is installed once into a named volume so each probe iteration
# costs seconds instead of a full `npm ci`. The volume is reused across runs.
set -uo pipefail

IMAGE="${IMAGE:-node:22.6.0-bookworm}"
VOL="${VOL:-gripm-node-modules}"
REPO="$PWD"

docker volume create "$VOL" >/dev/null

docker run --rm \
  -e PROBE_VOL="$VOL" \
  -v "$REPO":/src:ro \
  -v "$VOL":/nm \
  -w /work \
  "$IMAGE" bash -lc '
  set -uo pipefail
  mkdir -p /work
  tar -cf - -C /src --exclude=node_modules --exclude=.git . | tar -xf - -C /work

  if [ ! -d /nm/node_modules ]; then
    echo "--- npm ci (primera vez, se cachea en el volumen $PROBE_VOL) ---"
    npm ci --no-audit --no-fund --prefix /work >/tmp/ci.log 2>&1 || { echo "npm ci FALLO"; tail -20 /tmp/ci.log; exit 1; }
    cp -R /work/node_modules/. /nm/node_modules/ 2>/dev/null
  else
    echo "--- node_modules desde el volumen ---"
    cp -R /nm/node_modules /work/node_modules 2>/dev/null
  fi

  echo "--- probe de handles ---"
  CI=true GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=echo \
    node --experimental-strip-types scripts/probe-handles.js
  echo "PROBE_EXIT=$?"
'