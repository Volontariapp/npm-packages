#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Collect all package.json files (excluding common build/vendor dirs).
mapfile -d '' PACKAGE_JSON_FILES < <(
  find "$ROOT_DIR" -type f -name "package.json" \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/coverage/*" \
    -print0
)

# If none found, there is no snapshot package.
if [ "${#PACKAGE_JSON_FILES[@]}" -eq 0 ]; then
  echo "true"
  exit 0
fi

# Exit 1 if any package version matches 0.0.0-timestamp (prefix check: 0.0.0-*)
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
      console.error(`Snapshot version found: ${file} -> ${version}`);
      hasSnapshot = true;
    }
  } catch (err) {
    console.error(`Could not read ${file}: ${err.message}`);
    hasSnapshot = true;
  }
}

process.exit(hasSnapshot ? 1 : 0);
NODE
then
  echo "true"
  exit 0
else
  echo "false"
  exit 1
fi
