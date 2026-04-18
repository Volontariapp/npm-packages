#!/bin/bash
# ci-snap-publish.sh — Snapshot publisher with topological ordering.
#
# Reads a ci-orchestrate.py plan JSON and:
#   1. Stamps every BUILD package with its snapshot version (0.0.0-snap-<sha>)
#   2. Resolves workspace:* deps via resolve-workspaces.js
#   3. Builds all BUILD packages in one topological yarn pass
#   4. Publishes each BUILD package in dependency-first order (sequentially)
#   5. Writes .changeset/.snapshot-tags for the PR comment step
#
# Usage: bash scripts/ci-snap-publish.sh --plan <plan.json>
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Args ──────────────────────────────────────────────────────────────────────
PLAN_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan) PLAN_FILE="$2"; shift 2 ;;
    *) echo -e "${RED}Unknown argument: $1${NC}" >&2; exit 1 ;;
  esac
done

if [[ -z "$PLAN_FILE" || ! -f "$PLAN_FILE" ]]; then
  echo -e "${RED}Error: --plan <file> is required and must exist.${NC}" >&2
  exit 1
fi

PLAN=$(cat "$PLAN_FILE")

# ── Guard: nothing to do ──────────────────────────────────────────────────────
BUILD_COUNT=$(echo "$PLAN" | jq '[.packages[] | select(.action == "BUILD")] | length')
if [[ "$BUILD_COUNT" -eq 0 ]]; then
  echo -e "${GREEN}No packages to publish — nothing to do.${NC}"
  exit 0
fi

echo -e "${CYAN}=== Snapshot Publish: ${BUILD_COUNT} package(s) ===${NC}"

# ── Step 1: Stamp snapshot versions ──────────────────────────────────────────
echo -e "\n${CYAN}── Step 1/4: Stamping snapshot versions ─────────────────────────${NC}"
while IFS=$'\t' read -r PKG_ID SNAP_VER; do
  PKG_JSON="$PROJECT_ROOT/packages/$PKG_ID/package.json"
  node --input-type=module <<JS
import { readFileSync, writeFileSync } from 'fs';
const p = JSON.parse(readFileSync('$PKG_JSON', 'utf8'));
p.version = '$SNAP_VER';
writeFileSync('$PKG_JSON', JSON.stringify(p, null, 2) + '\n');
JS
  echo -e "  ${GREEN}✓ $PKG_ID → $SNAP_VER${NC}"
done < <(echo "$PLAN" | jq -r '.packages[] | select(.action == "BUILD") | [.id, .snapshot_version] | @tsv')

# ── Step 2: Resolve workspace:* references ────────────────────────────────────
echo -e "\n${CYAN}── Step 2/4: Resolving workspace:* references ───────────────────${NC}"
node scripts/resolve-workspaces.js

# ── Step 3: Topological build (yarn handles internal ordering) ────────────────
echo -e "\n${CYAN}── Step 3/4: Building packages (topological) ────────────────────${NC}"

BUILD_FROM_ARGS=()
while IFS= read -r PKG_ID; do
  PKG_NAME=$(node -p "require('./packages/$PKG_ID/package.json').name")
  BUILD_FROM_ARGS+=("--from" "$PKG_NAME")
done < <(echo "$PLAN" | jq -r '.packages[] | select(.action == "BUILD") | .id')

# -v verbose  -p parallel  -t topological  -R include workspace dependencies
yarn workspaces foreach -vpt "${BUILD_FROM_ARGS[@]}" -R run build

# ── Step 4: Publish in topological order (deps before consumers) ───────────────
echo -e "\n${CYAN}── Step 4/4: Publishing in topological order ────────────────────${NC}"

TAGS_FILE=".changeset/.snapshot-tags"
: > "$TAGS_FILE"

while IFS= read -r PKG_ID; do
  ACTION=$(echo "$PLAN" | jq -r ".packages[] | select(.id == \"$PKG_ID\") | .action")
  if [[ "$ACTION" != "BUILD" ]]; then
    echo -e "  ${YELLOW}⟳  SKIP $PKG_ID${NC}"
    continue
  fi

  PKG_NAME=$(node -p "require('./packages/$PKG_ID/package.json').name")
  PKG_VER=$(node -p "require('./packages/$PKG_ID/package.json').version")
  LAYER=$(echo "$PLAN" | jq -r ".packages[] | select(.id == \"$PKG_ID\") | .layer")

  echo -e "  ${CYAN}[layer $LAYER] Publishing ${PKG_NAME}@${PKG_VER}…${NC}"
  (
    cd "$PROJECT_ROOT/packages/$PKG_ID"
    yarn npm publish --access public --tag next
  )

  echo "${PKG_NAME}@${PKG_VER}" >> "$TAGS_FILE"
  echo -e "  ${GREEN}✓ ${PKG_NAME}@${PKG_VER}${NC}"
done < <(echo "$PLAN" | jq -r '.publish_order[]')

# ── Done ─────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}=== Publish complete ===${NC}"
cat "$TAGS_FILE"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  TAGS_CSV=$(paste -sd',' "$TAGS_FILE")
  echo "snapshot_tags=$TAGS_CSV" >> "$GITHUB_OUTPUT"
fi
