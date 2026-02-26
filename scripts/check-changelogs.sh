#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

CHECKER_BIN="${ROOT_DIR}/tools/changelog-checker-linux-amd64"
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [[ $(uname -m) == "arm64" ]]; then
    CHECKER_BIN="${ROOT_DIR}/tools/changelog-checker-darwin-arm64"
  else
    CHECKER_BIN="${ROOT_DIR}/tools/changelog-checker-darwin-amd64"
  fi
fi

if [ ! -f "${CHECKER_BIN}" ]; then
  echo -e "${RED}✖ Error: Changelog checker binary not found at ${CHECKER_BIN}${NC}"
  echo "Make sure the changelog-checker has been built and deployed."
  exit 1
fi

chmod +x "${CHECKER_BIN}"

FAILED=0

CHANGED_PACKAGES=()

cd "${ROOT_DIR}"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [ -n "${GITHUB_BASE_REF:-}" ]; then
    BASE_SHA="origin/${GITHUB_BASE_REF}"
  elif [[ -n "${GITHUB_BEFORE:-}" ]] && [[ "${GITHUB_BEFORE}" != "0000000000000000000000000000000000000000" ]]; then
    BASE_SHA="${GITHUB_BEFORE}"
  else
    if git rev-parse origin/main >/dev/null 2>&1; then
      BASE_SHA="origin/main"
    else
      BASE_SHA="HEAD~1"
    fi
  fi

  echo "🔍 Detecting changes against ${BASE_SHA}..."
  if git rev-parse "${BASE_SHA}" >/dev/null 2>&1; then
    CHANGED_FILES=$(git diff --name-only "${BASE_SHA}" HEAD || echo "")
    
    for package_dir in packages/*/; do
      clean_dir=${package_dir%/}
      if echo "$CHANGED_FILES" | grep -q "^${clean_dir}/"; then
        CHANGED_PACKAGES+=("${ROOT_DIR}/${package_dir}")
      fi
    done
  else
    echo -e "${YELLOW}⚠ Could not find ${BASE_SHA} locally. Fallback to checking all packages.${NC}"
    for d in "${ROOT_DIR}"/packages/*/; do CHANGED_PACKAGES+=("$d"); done
  fi
else
  for d in "${ROOT_DIR}"/packages/*/; do CHANGED_PACKAGES+=("$d"); done
fi

if [ ${#CHANGED_PACKAGES[@]} -eq 0 ]; then
  echo -e "${GREEN}✔ No packages were modified. Skipping changelog checks!${NC}"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "has_changes=false" >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

echo "🔍 Checking changelogs for modified packages..."

for package_dir in "${CHANGED_PACKAGES[@]}"; do
  if [ -d "${package_dir}" ]; then
    package_name=$(basename "${package_dir}")
    pkg_json="${package_dir}package.json"
    changelog="${package_dir}CHANGELOG.md"

    if [ ! -f "${pkg_json}" ]; then
      continue
    fi

    echo "📦 Package: ${package_name}..."

    if [ ! -f "${changelog}" ]; then
      echo -e "  ${YELLOW}⚠ No CHANGELOG.md found. Skipping.${NC}"
      continue
    fi

    if "${CHECKER_BIN}" "${pkg_json}" "${changelog}"; then
      :
    else
      FAILED=1
    fi
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo -e "\n${RED}✖ Some changelogs are invalid. Please fix them before merging.${NC}"
  exit 1
else
  echo -e "\n${GREEN}✔ All changelogs are valid!${NC}"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "has_changes=true" >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi
