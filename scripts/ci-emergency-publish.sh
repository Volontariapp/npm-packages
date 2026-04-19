#!/bin/bash
# ci-emergency-publish.sh — Emergency re-publisher.
#
# Reads a ci-orchestrate.py --force-all plan and publishes every package
# whose exact version is NOT yet on the npm registry. Already-published
# versions are silently skipped.
#
# Usage:
#   bash scripts/ci-emergency-publish.sh --plan <plan.json> [--dry-run]
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Args ──────────────────────────────────────────────────────────────────────
PLAN_FILE=""
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan)    PLAN_FILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true;   shift   ;;
    *) echo -e "${RED}Unknown argument: $1${NC}" >&2; exit 1 ;;
  esac
done

if [[ -z "$PLAN_FILE" || ! -f "$PLAN_FILE" ]]; then
  echo -e "${RED}Error: --plan <file> is required and must exist.${NC}" >&2
  exit 1
fi

PLAN=$(cat "$PLAN_FILE")
TOTAL=$(echo "$PLAN" | jq '[.packages[] | select(.action == "BUILD")] | length')
echo -e "${CYAN}=== Emergency Publish: ${TOTAL} package(s) to evaluate ===${NC}"
[[ "$DRY_RUN" == "true" ]] && echo -e "${YELLOW}  DRY-RUN mode — no packages will be published${NC}"

# ── Step 1: Resolve workspace:* references ────────────────────────────────────
if [[ "$DRY_RUN" != "true" ]]; then
  echo -e "\n${CYAN}── Step 1/3: Resolving workspace:* references ───────────────────${NC}"
  node scripts/resolve-workspaces.js
fi

# ── Step 2: Build all packages (topological) ──────────────────────────────────
if [[ "$DRY_RUN" != "true" ]]; then
  echo -e "\n${CYAN}── Step 2/3: Building all packages (topological) ────────────────${NC}"

  BUILD_FROM_ARGS=()
  while IFS= read -r PKG_ID; do
    PKG_NAME=$(node -p "require('./packages/$PKG_ID/package.json').name")
    BUILD_FROM_ARGS+=("--from" "$PKG_NAME")
  done < <(echo "$PLAN" | jq -r '.packages[] | select(.action == "BUILD") | .id')

  yarn workspaces foreach -vpt "${BUILD_FROM_ARGS[@]}" -R run build
fi

# ── Step 3: Publish missing versions in topological order ────────────────────
echo -e "\n${CYAN}── Step 3/3: Publishing missing versions ────────────────────────${NC}"

SKIPPED=()
PUBLISHED=()
FAILED=()

while IFS= read -r PKG_ID; do
  ACTION=$(echo "$PLAN" | jq -r ".packages[] | select(.id == \"$PKG_ID\") | .action")
  [[ "$ACTION" != "BUILD" ]] && continue

  PKG_JSON="packages/$PKG_ID/package.json"
  PKG_NAME=$(node -p "require('./$PKG_JSON').name")
  PKG_VER=$(node -p "require('./$PKG_JSON').version")
  LAYER=$(echo "$PLAN" | jq -r ".packages[] | select(.id == \"$PKG_ID\") | .layer")

  # Check if this exact version is already on the registry
  PUBLISHED_VER=$(npm view "${PKG_NAME}@${PKG_VER}" version 2>/dev/null || true)

  if [[ "$PUBLISHED_VER" == "$PKG_VER" ]]; then
    echo -e "  ${YELLOW}⟳  SKIP  [layer $LAYER] ${PKG_NAME}@${PKG_VER} (already on registry)${NC}"
    SKIPPED+=("${PKG_NAME}@${PKG_VER}")
    continue
  fi

  echo -e "  ${CYAN}→  PUBLISH [layer $LAYER] ${PKG_NAME}@${PKG_VER}${NC}"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}    [dry-run] would publish ${PKG_NAME}@${PKG_VER}${NC}"
    PUBLISHED+=("${PKG_NAME}@${PKG_VER} (dry-run)")
    continue
  fi

  if (
    cd "packages/$PKG_ID"
    yarn npm publish --access public --tag latest
  ); then
    echo -e "  ${GREEN}  ✓ ${PKG_NAME}@${PKG_VER}${NC}"
    PUBLISHED+=("${PKG_NAME}@${PKG_VER}")
  else
    echo -e "  ${RED}  ✗ FAILED ${PKG_NAME}@${PKG_VER}${NC}"
    FAILED+=("${PKG_NAME}@${PKG_VER}")
  fi

done < <(echo "$PLAN" | jq -r '.publish_order[]')

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}=== Summary ===${NC}"
echo -e "  Published : ${#PUBLISHED[@]}"
echo -e "  Skipped   : ${#SKIPPED[@]}"
echo -e "  Failed    : ${#FAILED[@]}"

if [[ ${#PUBLISHED[@]} -gt 0 ]]; then
  echo -e "\n${GREEN}Published:${NC}"
  for t in "${PUBLISHED[@]}"; do echo "  $t"; done
fi

if [[ ${#SKIPPED[@]} -gt 0 ]]; then
  echo -e "\n${YELLOW}Already on registry (skipped):${NC}"
  for t in "${SKIPPED[@]}"; do echo "  $t"; done
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo -e "\n${RED}Failed:${NC}"
  for t in "${FAILED[@]}"; do echo "  $t"; done
  exit 1
fi

# Write published tags to GITHUB_OUTPUT if available
if [[ -n "${GITHUB_OUTPUT:-}" && ${#PUBLISHED[@]} -gt 0 ]]; then
  TAGS_CSV=$(IFS=','; echo "${PUBLISHED[*]}")
  echo "published_tags=$TAGS_CSV" >> "$GITHUB_OUTPUT"
fi
