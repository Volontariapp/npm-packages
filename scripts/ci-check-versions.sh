#!/bin/bash
set -euo pipefail

# Root of the monorepo
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Collect all package.json files (excluding non-source directories).
mapfile -d '' PACKAGE_JSON_FILES < <(
  find "$ROOT_DIR/packages" -type f -name "package.json" \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/coverage/*" \
    -print0
)

if [ "${#PACKAGE_JSON_FILES[@]}" -eq 0 ]; then
  echo "true"
  exit 0
fi

# Exit 1 if any package version looks like a development snapshot (e.g. 0.0.0-*)
# This script ensures that we don't accidentally merge development version placeholders.
if node - "${PACKAGE_JSON_FILES[@]}" <<'NODE'
const fs = require("fs");
const files = process.argv.slice(2);
const snapshotPattern = /^0\.0\.0-/;
let hasSnapshot = false;

for (const file of files) {
  try {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    const version = typeof pkg.version === "string" ? pkg.version : "";
    if (snapshotPattern.test(version)) {
      console.error(`❌ Snapshot placeholder found in ${file}: ${version}`);
      hasSnapshot = true;
    }
  } catch (err) {
    console.error(`❌ Error reading ${file}: ${err.message}`);
    hasSnapshot = true;
  }
}
process.exit(hasSnapshot ? 1 : 0);
NODE
then
  echo "✅ No development-only version placeholders found."
  [ -n "${GITHUB_OUTPUT:-}" ] && echo "is_valid=true" >> "$GITHUB_OUTPUT"
  exit 0
else
  [ -n "${GITHUB_OUTPUT:-}" ] && echo "is_valid=false" >> "$GITHUB_OUTPUT"
  exit 1
fi
