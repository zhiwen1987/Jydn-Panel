#!/usr/bin/env bash
set -euo pipefail

# Regenerate assets/bindata.go from ./assets
# NOTE: bindata.go is committed to keep CI deterministic across architectures.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d "assets" ]]; then
  echo "ERROR: ./assets directory not found (cwd: $(pwd))" >&2
  exit 1
fi

# Ensure generator is available
if ! command -v go-bindata-assetfs >/dev/null 2>&1; then
  echo "go-bindata-assetfs not found; installing..." >&2
  GOBIN="${GOBIN:-$(go env GOPATH)/bin}"
  go install github.com/elazarl/go-bindata-assetfs/...@latest
  export PATH="$GOBIN:$PATH"
fi

OUT="assets/bindata.go"

echo "Generating $OUT ..."
go-bindata-assetfs -o="$OUT" -pkg=assets assets/...

echo

echo "Done. If assets changed, commit the updated $OUT:" 
if command -v git >/dev/null 2>&1; then
  git status --porcelain "$OUT" || true
fi
