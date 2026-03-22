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

Options:
  --packages      Comma-separated package identifiers.
                  You can use package directory names or npm package names.
  --release-type  One of: patch, minor, major, snapshot.
  --help          Show this help message.

Examples:
  $(basename "$0") --packages utils,core --release-type patch
  $(basename "$0") --packages @scope/utils --release-type snapshot
EOF
}

PACKAGES_INPUT=""
RELEASE_TYPE=""

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

if [ -z "$PACKAGES_INPUT" ] || [ -z "$RELEASE_TYPE" ]; then
    echo -e "${RED}Error: --packages and --release-type are required.${NC}"
    usage
    exit 1
fi

if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major|snapshot)$ ]]; then
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

if [ "${#SELECTED_INDICES[@]}" -eq 0 ]; then
    echo -e "${RED}Error: No valid packages were selected from --packages.${NC}"
    exit 1
fi

echo -e "\n${CYAN}Selected packages:${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    echo " - ${PKG_NAMES[$idx]} (${PKG_DIRS[$idx]}) current=${PKG_VERSIONS[$idx]}"
done

if [ "$RELEASE_TYPE" = "snapshot" ]; then
    echo -e "\n${CYAN}Applying snapshot versions (auto next suffix)...${NC}"

    for idx in "${SELECTED_INDICES[@]}"; do
        d="packages/${PKG_DIRS[$idx]}"
        pkg_json="$d/package.json"

        new_version=$(node - "$pkg_json" <<'NODE'
const fs = require('fs');

const file = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const current = pkg.version;

let base;
let nextNumber;

let m = current.match(/^(\d+)\.(\d+)(?:\.(\d+))?-next-(\d+)$/);
if (m) {
  base = m[3] !== undefined ? `${m[1]}.${m[2]}.${m[3]}` : `${m[1]}.${m[2]}`;
  nextNumber = Number(m[4]) + 1;
} else {
  m = current.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) {
    console.error(`Unsupported version format for snapshot: ${current}`);
    process.exit(1);
  }
  base = m[3] !== undefined ? `${m[1]}.${m[2]}.${m[3]}` : `${m[1]}.${m[2]}`;
  nextNumber = 0;
}

pkg.version = `${base}-next-${nextNumber}`;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
process.stdout.write(pkg.version);
NODE
)

        echo -e "${GREEN}${PKG_NAMES[$idx]}${NC}: ${PKG_VERSIONS[$idx]} -> ${new_version}"
    done

    echo -e "\n${GREEN}Snapshot versioning complete.${NC}"
else
    if [ ! -d ".changeset" ]; then
        echo -e "${RED}Error: .changeset directory not found.${NC}"
        exit 1
    fi

    echo -e "\n${CYAN}Creating temporary changesets for ${RELEASE_TYPE} release...${NC}"
    ts=$(date +%s)

    for idx in "${SELECTED_INDICES[@]}"; do
        name="${PKG_NAMES[$idx]}"
        safe_name=$(echo "$name" | sed 's/[@/]/_/g')
        filename=".changeset/release-temp-${safe_name}-${ts}-${RANDOM}.md"

        cat <<EOF > "$filename"
---
"${name}": ${RELEASE_TYPE}
---

Automated ${RELEASE_TYPE} release bump.
EOF
        CREATED_FILES+=("$filename")
    done

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
