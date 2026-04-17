#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

usage() {
    cat <<EOF
Usage: $(basename "$0") [--mode <snapshot|release>] --changed-packages <json|csv>

Arguments:
    --mode               Release mode (snapshot/release). Auto-detected if omitted.
    --changed-packages   Package names as JSON array or CSV list.
EOF
}

PLAN_FILE=""
MODE=""
CHANGED_PACKAGES_INPUT=""

while [ $# -gt 0 ]; do
    case "$1" in
        --mode) MODE="$2"; shift 2 ;;
        --changed-packages) CHANGED_PACKAGES_INPUT="$2"; shift 2 ;;
        --plan) PLAN_FILE="$2"; shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) echo -e "${RED}Error: Unknown argument '$1'.${NC}"; usage; exit 1 ;;
    esac
done

# Mode auto-detection
if [[ ! "$MODE" =~ ^(snapshot|release)$ ]]; then
    if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ]; then
        MODE="snapshot"
    else
        MODE="release"
    fi
    echo -e "${CYAN}Auto-resolved mode: ${MODE}${NC}"
fi

if [ -z "$CHANGED_PACKAGES_INPUT" ]; then
    echo -e "${RED}Error: --changed-packages is required.${NC}"; usage; exit 1
fi

# Parse packages
declare -a SELECTED_PACKAGE_DIRS=()
if [[ "$CHANGED_PACKAGES_INPUT" =~ ^\[.*\]$ ]]; then
    mapfile -t PKG_NAMES < <(node -e 'JSON.parse(process.argv[1]).forEach(p => console.log(p.trim()))' "$CHANGED_PACKAGES_INPUT")
else
    IFS=',' read -r -a PKG_NAMES <<< "$CHANGED_PACKAGES_INPUT"
fi

for pkg in "${PKG_NAMES[@]}"; do
    pkg=$(echo "$pkg" | xargs)
    [ -n "$pkg" ] || continue
    dir="packages/$pkg"
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        SELECTED_PACKAGE_DIRS+=("$dir")
    else
        echo -e "${RED}Error: Package $pkg not found.${NC}"; exit 1
    fi
done

echo -e "${CYAN}=== CI Publish Runner [${MODE}] ===${NC}"

if [ "$MODE" = "snapshot" ]; then
    TAG="next"

    if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
        echo -e "${CYAN}Applying Expert Lazy Versioning (Fingerprints)...${NC}"
        # Update all package versions in workspace to their content-hash snapshots
        # This ensures resolve-workspaces.js will point to the correct immutable identifiers
        node -e "
            const fs = require('fs');
            const plan = JSON.parse(fs.readFileSync('$PLAN_FILE', 'utf8'));
            plan.forEach(p => {
                const pkgPath = 'packages/' + p.id + '/package.json';
                if (fs.existsSync(pkgPath)) {
                    const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    data.version = p.version;
                    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n');
                }
            });
        "
    else
        # Fallback to standard snapshotting
        yarn exec changeset version --snapshot "$TAG"
        TS=$(date +%Y%m%d%H%M%S)
        for dir in "${SELECTED_PACKAGE_DIRS[@]}"; do
            VER=$(node -p "require('./$dir/package.json').version")
            if [[ ! "$VER" =~ "-" ]]; then
                S_VER="${VER}-next.${TS}"
                echo -e "${CYAN}Sourcing snapshot: ${S_VER}${NC}"
                node -e "const f='$dir/package.json'; const p=JSON.parse(require('fs').readFileSync(f)); p.version='$S_VER'; require('fs').writeFileSync(f, JSON.stringify(p, null, 2) + '\n')"
            fi
        done
    fi
else
    TAG=""
    yarn exec changeset version
fi

# Export tags for CI feedback
export_file=".changeset/.${MODE}-tags"
: > "$export_file"
for dir in "${SELECTED_PACKAGE_DIRS[@]}"; do
    NAME=$(node -p "require('./$dir/package.json').name")
    VER=$(node -p "require('./$dir/package.json').version")
    FULL="${NAME}@${VER}"
    echo "$FULL" >> "$export_file"
    echo -e "${GREEN}${FULL}${NC}"
done

if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "mode=$MODE" >> "$GITHUB_OUTPUT"
    echo "publish_tag=$TAG" >> "$GITHUB_OUTPUT"
    TAGS_CSV=$(paste -sd, "$export_file")
    [ "$MODE" = "snapshot" ] && echo "snapshot_tags=$TAGS_CSV" >> "$GITHUB_OUTPUT" || echo "release_tags=$TAGS_CSV" >> "$GITHUB_OUTPUT"
fi

node scripts/resolve-workspaces.js

# Build and Publish logic
BUILD_ARGS=()
PUBLISH_PKGS=()

for dir in "${SELECTED_PACKAGE_DIRS[@]}"; do
    NAME=$(node -p "require('./$dir/package.json').name")

    # If using a plan, we can skip if already deployed
    SHOULD_SKIP=false
    if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
        ACTION=$(jq -r ".[] | select(.name == \"$PKG_NAME\") | .action" "$PLAN_FILE" || echo "SKIP")
        if [ "$ACTION" == "SKIP" ] || [ -z "$ACTION" ] || [ "$ACTION" == "null" ]; then
            echo -e "${YELLOW}♻️  Plan says SKIP for $PKG_NAME. Skipping Build/Publish.${NC}"
            SHOULD_SKIP=true
        else
            echo -e "${CYAN}🚀 Plan says BUILD for $PKG_NAME.${NC}"
        fi
    fi

    if [ "$SHOULD_SKIP" = "false" ]; then
        BUILD_ARGS+=("--from" "$NAME")
        PUBLISH_PKGS+=("$dir")
    fi
done

if [ ${#BUILD_ARGS[@]} -gt 0 ]; then
    echo -e "${CYAN}Building packages in topological order...${NC}"
    yarn workspaces foreach -vpt "${BUILD_ARGS[@]}" -R run build

    echo -e "${CYAN}Publishing with tag [${TAG:-latest}]...${NC}"
    for dir in "${PUBLISH_PKGS[@]}"; do
        cd "$PROJECT_ROOT/$dir"
        yarn npm publish --access public ${TAG:+--tag $TAG}
        cd "$PROJECT_ROOT"
    done
else
    echo -e "${GREEN}All packages are up to date on registry. Nothing to build.${NC}"
fi

echo -e "${GREEN}Publication process complete.${NC}"
