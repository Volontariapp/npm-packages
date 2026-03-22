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

usage() {
    cat <<EOF
Usage: $(basename "$0") --packages <pkg1,pkg2,...> --release-type <patch|minor|major|snapshot>

If arguments are omitted, the script starts in interactive mode.

Options:
  --packages      Comma-separated package identifiers.
                  You can use package directory names or npm package names.
  --release-type  One of: patch, minor, major, snapshot.
    --message       Changelog message used in generated temporary changesets.
  --help          Show this help message.

Examples:
  $(basename "$0") --packages utils,core --release-type patch
  $(basename "$0") --packages @scope/utils --release-type snapshot
    $(basename "$0") --packages utils --release-type minor --message "Add validation for auth payload"
EOF
}

PACKAGES_INPUT=""
RELEASE_TYPE=""
CHANGELOG_MESSAGE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --packages)
            if [ $# -lt 2 ]; then
                echo -e "${RED}Error: --packages requires a value.${NC}"
                usage
                exit 1
            fi
            PACKAGES_INPUT="$2"
            shift 2
            ;;
        --release-type)
            if [ $# -lt 2 ]; then
                echo -e "${RED}Error: --release-type requires a value.${NC}"
                usage
                exit 1
            fi
            RELEASE_TYPE="$2"
            shift 2
            ;;
        --message)
            if [ $# -lt 2 ]; then
                echo -e "${RED}Error: --message requires a value.${NC}"
                usage
                exit 1
            fi
            CHANGELOG_MESSAGE="$2"
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

if [ -n "$RELEASE_TYPE" ] && [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major|snapshot)$ ]]; then
    echo -e "${RED}Error: --release-type must be one of patch, minor, major, snapshot.${NC}"
    exit 1
fi

echo -e "${CYAN}=== Release Version Generator ===${NC}"
echo -e "${CYAN}Scanning packages in $PROJECT_ROOT/packages...${NC}"

PKG_DIRS=()
PKG_NAMES=()
PKG_VERSIONS=()
SELECTED_INDICES=()
CREATED_FILES=()

declare -A PKG_DIR_TO_INDEX
declare -A PKG_NAME_TO_INDEX
declare -A SELECTED_SET

cleanup() {
    if [ "${#CREATED_FILES[@]}" -gt 0 ]; then
        echo -e "\n${CYAN}Cleaning up temporary changeset files...${NC}"
        for file in "${CREATED_FILES[@]}"; do
            if [ -f "$file" ]; then
                rm -f "$file"
            fi
        done
    fi
}

trap cleanup EXIT

i=0
for d in packages/*; do
    if [ -d "$d" ] && [ -f "$d/package.json" ]; then
        dir_name=$(basename "$d")
        full_name=$(node -p "require('./$d/package.json').name")
        version=$(node -p "require('./$d/package.json').version")

        PKG_DIRS+=("$dir_name")
        PKG_NAMES+=("$full_name")
        PKG_VERSIONS+=("$version")

        PKG_DIR_TO_INDEX["$dir_name"]=$i
        PKG_NAME_TO_INDEX["$full_name"]=$i
        i=$((i + 1))
    fi
done

if [ ${#PKG_DIRS[@]} -eq 0 ]; then
    echo -e "${RED}Error: No packages found in packages/.${NC}"
    exit 1
fi

if [ -z "$PACKAGES_INPUT" ]; then
    echo -e "\n${CYAN}Interactive mode: select packages${NC}"
    i=1
    for idx in "${!PKG_DIRS[@]}"; do
        echo -e "  [${i}] ${GREEN}${PKG_DIRS[$idx]}${NC} (${PKG_NAMES[$idx]} - v${PKG_VERSIONS[$idx]})"
        i=$((i + 1))
    done

    echo -e "\n${CYAN}Enter package numbers (space-separated) or 'all':${NC}"
    read -r -p "> " selection

    if [ "$selection" = "all" ]; then
        for idx in "${!PKG_DIRS[@]}"; do
            SELECTED_INDICES+=("$idx")
            SELECTED_SET["$idx"]=1
        done
    else
        for num in $selection; do
            if ! [[ "$num" =~ ^[0-9]+$ ]]; then
                echo -e "${RED}Invalid selection: $num${NC}"
                continue
            fi

            idx=$((num - 1))
            if [ "$idx" -lt 0 ] || [ "$idx" -ge ${#PKG_DIRS[@]} ]; then
                echo -e "${RED}Index out of range: $num${NC}"
                continue
            fi

            if [ -z "${SELECTED_SET[$idx]+x}" ]; then
                SELECTED_INDICES+=("$idx")
                SELECTED_SET["$idx"]=1
            fi
        done
    fi
else
    IFS=',' read -r -a REQUESTED_PACKAGES <<< "$PACKAGES_INPUT"

    for raw_pkg in "${REQUESTED_PACKAGES[@]}"; do
        pkg="${raw_pkg#"${raw_pkg%%[![:space:]]*}"}"
        pkg="${pkg%"${pkg##*[![:space:]]}"}"

        if [ -z "$pkg" ]; then
            continue
        fi

        idx=""
        if [ -n "${PKG_DIR_TO_INDEX[$pkg]+x}" ]; then
            idx="${PKG_DIR_TO_INDEX[$pkg]}"
        elif [ -n "${PKG_NAME_TO_INDEX[$pkg]+x}" ]; then
            idx="${PKG_NAME_TO_INDEX[$pkg]}"
        else
            echo -e "${RED}Error: Unknown package '$pkg'.${NC}"
            exit 1
        fi

        if [ -z "${SELECTED_SET[$idx]+x}" ]; then
            SELECTED_INDICES+=("$idx")
            SELECTED_SET["$idx"]=1
        fi
    done
fi

if [ "${#SELECTED_INDICES[@]}" -eq 0 ]; then
    echo -e "${RED}Error: No valid packages were selected from --packages.${NC}"
    exit 1
fi

if [ -z "$RELEASE_TYPE" ]; then
    echo -e "\n${CYAN}Interactive mode: choose release type${NC}"
    echo "  [1] patch"
    echo "  [2] minor"
    echo "  [3] major"
    echo "  [4] snapshot"
    read -r -p "> " release_choice

    case "$release_choice" in
        1) RELEASE_TYPE="patch" ;;
        2) RELEASE_TYPE="minor" ;;
        3) RELEASE_TYPE="major" ;;
        4) RELEASE_TYPE="snapshot" ;;
        *)
            echo -e "${RED}Invalid release type selection.${NC}"
            exit 1
            ;;
    esac
fi

if [ -z "$CHANGELOG_MESSAGE" ]; then
    echo -e "\n${CYAN}Changelog message (used by changesets):${NC}"
    read -r -p "> " CHANGELOG_MESSAGE
fi

if [ -z "$CHANGELOG_MESSAGE" ]; then
    CHANGELOG_MESSAGE="Automated ${RELEASE_TYPE} release bump."
fi

echo -e "\n${CYAN}Selected packages:${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    echo " - ${PKG_NAMES[$idx]} (${PKG_DIRS[$idx]}) current=${PKG_VERSIONS[$idx]}"
done
echo -e "${CYAN}Changelog message:${NC} ${CHANGELOG_MESSAGE}"

if [ ! -d ".changeset" ]; then
    echo -e "${RED}Error: .changeset directory not found.${NC}"
    exit 1
fi

BUMP_TYPE="$RELEASE_TYPE"
SNAPSHOT_TAG=""

if [ "$RELEASE_TYPE" = "snapshot" ]; then
    echo -e "\n${CYAN}Preparing snapshot release with Changesets CLI...${NC}"
    BUMP_TYPE="patch"

    computed_next=""
    for idx in "${SELECTED_INDICES[@]}"; do
        current="${PKG_VERSIONS[$idx]}"
        next_for_pkg=0

        if [[ "$current" =~ -next-([0-9]+)(-.+)?$ ]]; then
            next_for_pkg=$((BASH_REMATCH[1] + 1))
        fi

        if [ -z "$computed_next" ]; then
            computed_next="$next_for_pkg"
        elif [ "$computed_next" -ne "$next_for_pkg" ]; then
            echo -e "${RED}Error: Selected packages are on different snapshot indexes.${NC}"
            echo -e "${RED}Please run snapshot release separately per package or align versions first.${NC}"
            exit 1
        fi
    done

    SNAPSHOT_TAG="next-${computed_next}"
    echo -e "${CYAN}Snapshot tag resolved to '${SNAPSHOT_TAG}'.${NC}"
fi

echo -e "\n${CYAN}Creating temporary changesets for ${RELEASE_TYPE} release...${NC}"
ts=$(date +%s)

for idx in "${SELECTED_INDICES[@]}"; do
    name="${PKG_NAMES[$idx]}"
    safe_name=$(echo "$name" | sed 's/[@/]/_/g')
    filename=".changeset/release-temp-${safe_name}-${ts}-${RANDOM}.md"

    cat <<EOF > "$filename"
---
"${name}": ${BUMP_TYPE}
---

${CHANGELOG_MESSAGE}
EOF
    CREATED_FILES+=("$filename")
done

if [ "$RELEASE_TYPE" = "snapshot" ]; then
    echo -e "${CYAN}Running changeset version --snapshot ${SNAPSHOT_TAG}...${NC}"
    yarn exec changeset version --snapshot "$SNAPSHOT_TAG"
    echo -e "\n${GREEN}Snapshot release versioning complete.${NC}"
else
    echo -e "${CYAN}Running changeset version...${NC}"
    yarn exec changeset version
    echo -e "\n${GREEN}${RELEASE_TYPE^} release versioning complete.${NC}"
fi

echo -e "\n${CYAN}Resulting selected package versions:${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    d="packages/${PKG_DIRS[$idx]}"
    current_version=$(node -p "require('./$d/package.json').version")
    echo -e "${GREEN}${PKG_NAMES[$idx]}${NC}: ${current_version}"
done

echo -e "\n${CYAN}Publish step is intentionally skipped. CI is responsible for publishing.${NC}"
echo -e "${GREEN}Done.${NC}"
