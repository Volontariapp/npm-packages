#!/bin/bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

if [ ! -d "packages" ]; then
    echo -e "${RED}Error: 'packages' directory not found in $PROJECT_ROOT${NC}"
    exit 1
fi

if [ ! -d ".changeset" ]; then
    echo -e "${RED}Error: .changeset directory not found.${NC}"
    exit 1
fi

usage() {
    cat <<EOF
Usage: $(basename "$0") [--mode <snapshot|release>] --changed-packages <json|csv>

CI-only script:
    --mode snapshot  Version in snapshot mode, output package tags, and publish with tag 'next'.
    --mode release   Version for standard release, output package tags, and publish.
                     If omitted, detected from GITHUB_EVENT_NAME.

Arguments:
    --mode               Release mode. Optional.
    --changed-packages   Changed packages as JSON array (e.g. ["domain-user","contracts"]) or CSV.
EOF
}

MODE=""
CHANGED_PACKAGES_INPUT=""

while [ $# -gt 0 ]; do
    case "$1" in
        --mode)
            if [ $# -lt 2 ]; then
                echo -e "${RED}Error: --mode requires a value.${NC}"
                usage
                exit 1
            fi
            MODE="$2"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        --changed-packages)
            if [ $# -lt 2 ]; then
                echo -e "${RED}Error: --changed-packages requires a value.${NC}"
                usage
                exit 1
            fi
            CHANGED_PACKAGES_INPUT="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Error: Unknown argument '$1'.${NC}"
            usage
            exit 1
            ;;
    esac
done

if [[ ! "$MODE" =~ ^(snapshot|release)$ ]]; then
    if [ -n "$MODE" ]; then
        echo -e "${RED}Error: --mode must be snapshot or release (got: '$MODE').${NC}"
        usage
        exit 1
    fi

    # Auto-resolve mode from GitHub environment if missing
    if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ]; then
        MODE="snapshot"
    else
        MODE="release"
    fi
    echo -e "${CYAN}Auto-resolved mode: ${MODE} (from GITHUB_EVENT_NAME='${GITHUB_EVENT_NAME:-}') ${NC}"
fi

if [ -z "$CHANGED_PACKAGES_INPUT" ]; then
    echo -e "${RED}Error: --changed-packages is required.${NC}"
    usage
    exit 1
fi

# Parse changed packages as either a JSON array or CSV list.
declare -a CHANGED_PACKAGES=()
if [[ "$CHANGED_PACKAGES_INPUT" =~ ^\[.*\]$ ]]; then
    mapfile -t CHANGED_PACKAGES < <(node -e '
const raw = process.argv[1];
let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  process.exit(2);
}
if (!Array.isArray(parsed)) {
  process.exit(3);
}
for (const item of parsed) {
  if (typeof item === "string" && item.trim().length > 0) {
    console.log(item.trim());
  }
}
' "$CHANGED_PACKAGES_INPUT") || {
        echo -e "${RED}Error: invalid JSON for --changed-packages.${NC}"
        exit 1
    }
else
    IFS=',' read -r -a csv_packages <<< "$CHANGED_PACKAGES_INPUT"
    for pkg in "${csv_packages[@]}"; do
        trimmed=$(echo "$pkg" | xargs)
        if [ -n "$trimmed" ]; then
            CHANGED_PACKAGES+=("$trimmed")
        fi
    done
fi

if [ ${#CHANGED_PACKAGES[@]} -eq 0 ]; then
    echo -e "${RED}Error: no changed packages were provided.${NC}"
    exit 1
fi

declare -a SELECTED_PACKAGE_DIRS=()
for package_selector in "${CHANGED_PACKAGES[@]}"; do
    package_dir="packages/$package_selector"
    if [ -d "$package_dir" ] && [ -f "$package_dir/package.json" ]; then
        SELECTED_PACKAGE_DIRS+=("$package_dir")
    else
        echo -e "${RED}Error: package not found for selector '$package_selector'.${NC}"
        exit 1
    fi
done

echo -e "${CYAN}=== CI Release Runner ===${NC}"
echo -e "${CYAN}Mode:${NC} ${MODE}"
echo -e "${CYAN}Changed packages:${NC} ${CHANGED_PACKAGES[*]}"

if [ "$MODE" = "snapshot" ]; then
    snapshot_tag="next"
    echo -e "${CYAN}Running snapshot versioning with dist-tag '${snapshot_tag}'...${NC}"
    yarn exec changeset version --snapshot "$snapshot_tag"

    timestamp=$(date +%Y%m%d%H%M%S)
    for package_dir in "${SELECTED_PACKAGE_DIRS[@]}"; do
        package_version=$(node -p "require('./$package_dir/package.json').version")
        if [[ ! "$package_version" =~ "-" ]]; then
            new_snapshot_version="${package_version}-next.${timestamp}"
            echo -e "${CYAN}Forcing snapshot version for ${package_dir}: ${new_snapshot_version}${NC}"
            node -e "const fs=require('fs'); const file='$package_dir/package.json'; const pkg=JSON.parse(fs.readFileSync(file, 'utf8')); pkg.version='$new_snapshot_version'; fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');"
        fi
    done

    : > "$PROJECT_ROOT/.changeset/.snapshot-tags"
    for package_dir in "${SELECTED_PACKAGE_DIRS[@]}"; do
        package_name=$(node -p "require('./$package_dir/package.json').name")
        package_version=$(node -p "require('./$package_dir/package.json').version")
        full_tag="${package_name}@${package_version}"
        echo "$full_tag" >> "$PROJECT_ROOT/.changeset/.snapshot-tags"
        echo -e "${GREEN}${full_tag}${NC}"
    done

    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "mode=$MODE" >> "$GITHUB_OUTPUT"
        echo "publish_tag=$snapshot_tag" >> "$GITHUB_OUTPUT"
        snapshot_tags_csv=$(paste -sd, "$PROJECT_ROOT/.changeset/.snapshot-tags")
        echo "snapshot_tags=$snapshot_tags_csv" >> "$GITHUB_OUTPUT"
    fi

    echo -e "${CYAN}Publishing snapshot packages...${NC}"
    yarn exec changeset publish --tag "$snapshot_tag"
    echo -e "${GREEN}Snapshot publication complete.${NC}"
else
    echo -e "${CYAN}Running release versioning...${NC}"
    yarn exec changeset version

    : > "$PROJECT_ROOT/.changeset/.release-tags"
    for package_dir in "${SELECTED_PACKAGE_DIRS[@]}"; do
        package_name=$(node -p "require('./$package_dir/package.json').name")
        package_version=$(node -p "require('./$package_dir/package.json').version")
        full_tag="${package_name}@${package_version}"
        echo "$full_tag" >> "$PROJECT_ROOT/.changeset/.release-tags"
        echo -e "${GREEN}${full_tag}${NC}"
    done

    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "mode=$MODE" >> "$GITHUB_OUTPUT"
        echo "publish_tag=" >> "$GITHUB_OUTPUT"
        release_tags_csv=$(paste -sd, "$PROJECT_ROOT/.changeset/.release-tags")
        echo "release_tags=$release_tags_csv" >> "$GITHUB_OUTPUT"
    fi

    echo -e "${CYAN}Publishing release packages...${NC}"
    yarn exec changeset publish
    echo -e "${GREEN}Release publication complete.${NC}"
fi
