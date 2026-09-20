#!/usr/bin/env bash
#
# Runs the visual-regression project inside the official Playwright image.
#
# Why: font rasterisation is not portable. Arch and Ubuntu hint and antialias
# glyphs differently, so a baseline recorded on a developer machine would never
# match the one the runner compares against — every spec would fail for a
# reason that has nothing to do with the UI. Pinning the image pins the fonts,
# the freetype build and the Chromium build, which is what makes a byte-strict
# threshold possible at all.
#
#   e2e/visual/run-in-docker.sh                       run the suite
#   e2e/visual/run-in-docker.sh --update-snapshots    approve a redesign
#   e2e/visual/run-in-docker.sh public.spec.ts        one file
#
# The app is built on the host (the image has no pnpm) and served inside the
# container by playwright.config.ts's own webServer, straight out of
# .next/standalone — the artifact production runs.
set -euo pipefail

IMAGE='mcr.microsoft.com/playwright:v1.63.0-noble'
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# --- the image and the package must be the same Playwright ------------------
installed="$(node -p "require('./node_modules/@playwright/test/package.json').version")"
tagged="${IMAGE##*:v}"
tagged="${tagged%%-*}"
if [ "$installed" != "$tagged" ]; then
  echo "Playwright version mismatch:" >&2
  echo "  @playwright/test: $installed" >&2
  echo "  docker image:     $tagged ($IMAGE)" >&2
  echo "Bump IMAGE in $0 to v$installed-noble (and re-record the baselines)." >&2
  exit 1
fi

# --- the artifact the suite photographs -------------------------------------
if [ "${VISUAL_BUILD:-}" = '1' ] || [ ! -f .next/standalone/server.js ]; then
  echo "==> building the standalone artifact on the host (pnpm build)"
  NODE_ENV=production pnpm build
fi

if [ ! -d node_modules/@playwright/test ]; then
  echo 'node_modules is missing; run pnpm install first.' >&2
  exit 1
fi

# --- run ---------------------------------------------------------------------
# --network host so the container reaches the Postgres, Redis and MinIO the
#   developer already has on localhost, and so PLAYWRIGHT_BASE_URL stays
#   http://localhost:3000 for the server the suite boots inside the container.
# --ipc=host because Chromium runs out of /dev/shm otherwise.
# --user so the baselines land owned by the developer, not by root; HOME then
#   has to point somewhere writable.
# HOSTNAME=0.0.0.0 because next's standalone server binds to $HOSTNAME, which
#   docker otherwise sets to the container's name — the suite would then wait
#   ten minutes for a localhost:3000 nothing is listening on.
# The repo is mounted at its own absolute path, so absolute paths in .env
# (REDIS_TLS_CA_PATH) resolve to the same file inside the container.
exec docker run --rm --init \
  --network host \
  --ipc=host \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env CI \
  --env HOSTNAME=0.0.0.0 \
  --env PLAYWRIGHT_SKIP_BUILD=true \
  --volume "$ROOT:$ROOT" \
  --workdir "$ROOT" \
  "$IMAGE" \
  node_modules/.bin/playwright test --project=visual --workers=1 "$@"
