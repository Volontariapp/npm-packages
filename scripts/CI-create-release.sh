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
Usage: $(basename "$0") --mode <snapshot|release>

CI-only script:
  --mode snapshot  Run changeset version in snapshot mode with auto next-N tag.
  --mode release   Run standard changeset version for real releases.
EOF
}

MODE=""

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
        *)
            echo -e "${RED}Error: Unknown argument '$1'.${NC}"
            usage
            exit 1
            ;;
    esac
done

if [[ ! "$MODE" =~ ^(snapshot|release)$ ]]; then
    echo -e "${RED}Error: --mode must be snapshot or release.${NC}"
    usage
    exit 1
fi

echo -e "${CYAN}=== CI Release Runner ===${NC}"
echo -e "${CYAN}Mode:${NC} ${MODE}"

if [ "$MODE" = "snapshot" ]; then
    max_next=-1

    for d in packages/*; do
        if [ -d "$d" ] && [ -f "$d/package.json" ]; then
            current_version=$(node -p "require('./$d/package.json').version")
            if [[ "$current_version" =~ -next-([0-9]+)(-.+)?$ ]]; then
                next_value=${BASH_REMATCH[1]}
                if [ "$next_value" -gt "$max_next" ]; then
                    max_next=$next_value
                fi
            fi
        fi
    done

    next_index=$((max_next + 1))
    snapshot_tag="next-${next_index}"

    echo -e "${CYAN}Running snapshot versioning with tag '${snapshot_tag}'...${NC}"
    yarn exec changeset version --snapshot "$snapshot_tag"
    echo -e "${GREEN}Snapshot versioning complete.${NC}"
    
    # Store the snapshot tag for use in CI/CD
    echo "$snapshot_tag" > "$PROJECT_ROOT/.changeset/.snapshot-tag"
else
    echo -e "${CYAN}Running release versioning...${NC}"
    yarn exec changeset version
    echo -e "${GREEN}Release versioning complete.${NC}"
fi
