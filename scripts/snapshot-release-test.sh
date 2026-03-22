#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper to find where we are
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
# Assuming script is in npm-packages/scripts/, project root is up one level
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

if [ ! -d "packages" ]; then
    echo -e "${RED}Error: 'packages' directory not found in $PROJECT_ROOT${NC}"
    exit 1
fi

# Define cleanup function
cleanup() {
    # If we exited successfully or with error, we might need cleanup

    # Check if we have packages to restore
    if [ "${#SELECTED_INDICES[@]}" -gt 0 ]; then
        echo -e "\n${CYAN}Running cleanup (restoring from backups)...${NC}"
        for idx in "${SELECTED_INDICES[@]}"; do
            d="packages/${PKG_DIRS[$idx]}"
            if [ -f "$d/package.json.bak" ]; then
                echo -e "Restoring $d/package.json from backup..."
                mv "$d/package.json.bak" "$d/package.json"
            fi
        done
    elif [ -n "$CREATED_FILES" ]; then
        echo -e "\n${CYAN}Running cleanup (reverting Changeset files)...${NC}"
    fi

    # Remove temporary changesets
    if [ -n "$CREATED_FILES" ]; then
        for file in "${CREATED_FILES[@]}"; do
            if [ -f "$file" ]; then rm -f "$file"; fi
        done
    fi

    # Restore changelog files to avoid leaving snapshot traces
    if [ -n "$CHANGELOG_BACKUP_FILES" ]; then
        echo -e "\n${CYAN}Restoring changelog files...${NC}"
        for file in "${CHANGELOG_BACKUP_FILES[@]}"; do
            if [ -f "$file.snapshot.bak" ]; then
                mv "$file.snapshot.bak" "$file"
            fi
        done
    fi

    # Remove changelog files created only by snapshot versioning
    if [ -n "$CHANGELOG_CREATED_FILES" ]; then
        for file in "${CHANGELOG_CREATED_FILES[@]}"; do
            if [ -f "$file" ]; then rm -f "$file"; fi
        done
    fi
}

# Trap cleanup on exit (covers success, error, interrupt)
trap cleanup EXIT

echo -e "${CYAN}=== Snapshot Release Generator ===${NC}"
echo -e "${CYAN}Scanning packages in $PROJECT_ROOT/packages...${NC}"

# Arrays to store package info
PKG_DIRS=()
PKG_NAMES=()
PKG_VERSIONS=()

# Counter
i=1

# Find packages and read names
for d in packages/*; do
    if [ -d "$d" ] && [ -f "$d/package.json" ]; then
        dir_name=$(basename "$d")
        # Use node to reliably parse package.json
        full_name=$(node -p "require('./$d/package.json').name")
        version=$(node -p "require('./$d/package.json').version")

        PKG_DIRS+=("$dir_name")
        PKG_NAMES+=("$full_name")
        PKG_VERSIONS+=("$version")

        echo -e "  [${i}] ${GREEN}${dir_name}${NC} (${full_name} - v${version})"
        i=$((i+1))
    fi
done

echo ""
echo -e "${CYAN}Enter the numbers of the packages to snapshot (space-separated, e.g. '1 3'), or 'all':${NC}"
read -p "> " selection

SELECTED_INDICES=()

if [ "$selection" == "all" ]; then
    for ((j=0; j<${#PKG_DIRS[@]}; j++)); do
        SELECTED_INDICES+=($j)
    done
else
    # Split selection by space
    for num in $selection; do
        # Validate number
        if ! [[ "$num" =~ ^[0-9]+$ ]]; then
            echo -e "${RED}Invalid selection: $num${NC}"
            continue
        fi

        # Adjust for 0-based array index (input was 1-based)
        idx=$((num-1))

        if [ $idx -ge 0 ] && [ $idx -lt ${#PKG_DIRS[@]} ]; then
            SELECTED_INDICES+=($idx)
        else
            echo -e "${RED}Index out of range: $num${NC}"
        fi
    done
fi

if [ ${#SELECTED_INDICES[@]} -eq 0 ]; then
    echo -e "${RED}No valid packages selected. Exiting.${NC}"
    exit 0
fi

# Confirm selection
echo -e "\n${CYAN}You selected:${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    echo " - ${PKG_NAMES[$idx]} (Current: ${PKG_VERSIONS[$idx]})"
done

# Prompt for snapshot tag
echo -e "\n${CYAN}Enter snapshot tag (default: next):${NC}"
read -p "> " tag_input
TAG=${tag_input:-next}

# Backup package.json files before any changes
echo -e "\n${CYAN}Backing up package.json files...${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    d="packages/${PKG_DIRS[$idx]}"
    echo "Backing up $d/package.json"
    cp "$d/package.json" "$d/package.json.bak"
done

# Temporary Changesets tracking
CREATED_FILES=()
CHANGELOG_BACKUP_FILES=()
CHANGELOG_CREATED_FILES=()

# Backup changelog files so snapshot runs do not leave changelog traces
echo -e "\n${CYAN}Backing up changelog files...${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    d="packages/${PKG_DIRS[$idx]}"
    changelog_file="$d/CHANGELOG.md"
    if [ -f "$changelog_file" ]; then
        cp "$changelog_file" "$changelog_file.snapshot.bak"
        CHANGELOG_BACKUP_FILES+=("$changelog_file")
    else
        CHANGELOG_CREATED_FILES+=("$changelog_file")
    fi
done

# Create changesets
echo -e "\n${CYAN}Creating temporary changesets...${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
    name="${PKG_NAMES[$idx]}"
    safe_name=$(echo "$name" | sed 's/[@/]/_/g')
    filename=".changeset/snapshot-temp-${safe_name}-$(date +%s).md"

    # We use 'patch' bump to ensure the snapshot increments from the current version.
    echo -e "DEBUG: Creating changeset for ${name} (current version: ${PKG_VERSIONS[$idx]})"
    cat <<EOF > "$filename"
---
"${name}": patch
---

Snapshot release
EOF
    CREATED_FILES+=("$filename")
done

echo -e "${GREEN}Changesets created.${NC}"

# Check changeset status (Debug)
echo -e "\n${CYAN}Checking changeset status...${NC}"
yarn changeset status --verbose

# Run changeset version
echo -e "\n${CYAN}Running changeset version --snapshot ${TAG}...${NC}"

# We use yarn exec to ensure we use the local changesets binary
yarn exec changeset version --snapshot "$TAG"

EXIT_CODE=$?

# Cleanup
echo -e "\n${CYAN}Cleaning up temporary changesets...${NC}"
for file in "${CREATED_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
    fi
done

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "\n${RED}Snapshot versioning failed.${NC}"
    exit $EXIT_CODE
fi

echo -e "\n${GREEN}Snapshot versioning complete!${NC}"

# Check for 0.0.0 issue
echo -e "\n${CYAN}Verifying package versions...${NC}"
has_zero_version=false
for d in packages/*; do
    if [ -d "$d" ] && [ -f "$d/package.json" ]; then
        pkg_name=$(basename "$d")
        current_version=$(node -p "require('./$d/package.json').version")
        if [[ "$current_version" == "0.0.0"* ]]; then
             echo -e "${RED}WARNING: Package $pkg_name has version $current_version${NC}"
             has_zero_version=true
        else
             echo -e "${GREEN}Package $pkg_name has version $current_version${NC}"
        fi
    fi
done

echo -e "\n${CYAN}Do you want to publish these packages to the registry now? (y/N)${NC}"
read -p "> " publish_confirm

if [[ "$publish_confirm" =~ ^[Yy]$ ]]; then
    echo -e "\n${CYAN}Building selected packages...${NC}"

    # Build only selected packages
    for idx in "${SELECTED_INDICES[@]}"; do
        pkg_name="${PKG_NAMES[$idx]}"
        echo -e "Building ${pkg_name}..."
        yarn workspace "$pkg_name" run build
        if [ $? -ne 0 ]; then
            echo -e "\n${RED}Build failed for ${pkg_name}. Aborting publish.${NC}"
            exit 1
        fi
    done

    echo -e "\n${CYAN}Disabling provenance in package.json for snapshot release...${NC}"
    # Manually disable provenance in package.json to avoid OIDC errors before publish
    for idx in "${SELECTED_INDICES[@]}"; do
        d="packages/${PKG_DIRS[$idx]}"
        # Run node inline script to remove provenance config
        if [ -f "$d/package.json" ]; then
             node -e "
                const fs = require('fs');
                const pkg = require('./$d/package.json');
                if (pkg.publishConfig && pkg.publishConfig.provenance) {
                    delete pkg.publishConfig.provenance;
                    fs.writeFileSync('./$d/package.json', JSON.stringify(pkg, null, 2) + '\n');
                }
            "
        fi
    done
    echo -e "\n${CYAN}Publishing with tag '${TAG}'...${NC}"
    yarn changeset publish --tag "$TAG"

    echo -e "\n${GREEN}Publish complete!${NC}"
else
    echo -e "\n${CYAN}Skipping publish. You can publish manually later with:${NC}"
    echo -e "yarn changeset publish --tag ${TAG}"
fi

# Cleanup implies by trap EXIT
echo -e "${GREEN}Done.${NC}"
