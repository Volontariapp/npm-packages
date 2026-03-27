#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Get all packages
mapfile -d '' PKG_FILES < <(find "$ROOT_DIR/packages" -maxdepth 2 -name "package.json" -not -path "*/node_modules/*" -print0)

NEW_PACKAGES=()

for pkg_file in "${PKG_FILES[@]}"; do
  PKG_NAME=$(node -p "require('$pkg_file').name")

  if ! npm view "$PKG_NAME" version > /dev/null 2>&1; then
    # Package not found on registry
    DIR_NAME=$(basename "$(dirname "$pkg_file")")
    NEW_PACKAGES+=("$DIR_NAME")
  fi
done

if [ ${#NEW_PACKAGES[@]} -eq 0 ]; then
  echo "[]"
else
  printf '%s\n' "${NEW_PACKAGES[@]}" | jq -R . | jq -s -c .
fi
