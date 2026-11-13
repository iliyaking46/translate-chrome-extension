#!/usr/bin/env bash
# Packs the extension into dist/translate-helper-<version>.zip for the Chrome Web Store.
set -euo pipefail

cd "$(dirname "$0")"

VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
if [[ -z "$VERSION" ]]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi

OUT="dist/translate-helper-$VERSION.zip"
FILES=(manifest.json ./*.js ./*.html ./*.css icons)

mkdir -p dist
rm -f "$OUT"
zip -qr "$OUT" "${FILES[@]}" -x '*.DS_Store'

echo "Built $OUT"
unzip -l "$OUT" | tail -n +4 | sed '$d' | sed '$d' | awk '{print "  " $4}'
