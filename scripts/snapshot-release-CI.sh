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

# Temporary Changesets/changelog tracking
CREATED_FILES=()
CHANGELOG_BACKUP_FILES=()
CHANGELOG_CREATED_FILES=()
SELECTED_INDICES=()

# Define cleanup function
cleanup() {
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
	elif [ "${#CREATED_FILES[@]}" -gt 0 ]; then
		echo -e "\n${CYAN}Running cleanup (reverting Changeset files)...${NC}"
	fi

	# Remove temporary changesets
	if [ "${#CREATED_FILES[@]}" -gt 0 ]; then
		for file in "${CREATED_FILES[@]}"; do
			if [ -f "$file" ]; then rm -f "$file"; fi
		done
	fi

	# Restore changelog files to avoid leaving snapshot traces
	if [ "${#CHANGELOG_BACKUP_FILES[@]}" -gt 0 ]; then
		echo -e "\n${CYAN}Restoring changelog files...${NC}"
		for file in "${CHANGELOG_BACKUP_FILES[@]}"; do
			if [ -f "$file.snapshot.bak" ]; then
				mv "$file.snapshot.bak" "$file"
			fi
		done
	fi

	# Remove changelog files created only by snapshot versioning
	if [ "${#CHANGELOG_CREATED_FILES[@]}" -gt 0 ]; then
		for file in "${CHANGELOG_CREATED_FILES[@]}"; do
			if [ -f "$file" ]; then rm -f "$file"; fi
		done
	fi
}

# Trap cleanup on exit (covers success, error, interrupt)
trap cleanup EXIT

print_usage() {
	cat <<EOF
Usage: $(basename "$0") [options]

CI snapshot release helper.

Options:
  --package <value>    Package selector. Repeatable.
					   Accepts package dir (e.g. my-lib) or full package name (e.g. @scope/my-lib).
  --packages <list>    Comma-separated list of package selectors.
  --tag <tag>          Snapshot tag (default: next).
  --no-publish         Only version and build packages, skip publish.
  -h, --help           Show this help.

Env fallbacks:
  MATRIX_PACKAGE       Single package selector from CI matrix.
  PACKAGES             Comma-separated package selectors.
  SNAPSHOT_TAG         Snapshot tag.

Examples:
  $(basename "$0") --package @scope/pkg-a --tag next
  $(basename "$0") --packages pkg-a,pkg-b --no-publish
  MATRIX_PACKAGE=@scope/pkg-a $(basename "$0")
EOF
}

echo -e "${CYAN}=== Snapshot Release Generator (CI) ===${NC}"
echo -e "${CYAN}Scanning packages in $PROJECT_ROOT/packages...${NC}"

# Arrays to store package info
PKG_DIRS=()
PKG_NAMES=()
PKG_VERSIONS=()

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
	fi
done

if [ ${#PKG_DIRS[@]} -eq 0 ]; then
	echo -e "${RED}No packages found in $PROJECT_ROOT/packages.${NC}"
	exit 1
fi

TAG="${SNAPSHOT_TAG:-next}"
DO_PUBLISH=true
PACKAGE_SELECTORS=()

while [ $# -gt 0 ]; do
	case "$1" in
		--package)
			if [ -z "$2" ]; then
				echo -e "${RED}Missing value for --package${NC}"
				exit 1
			fi
			PACKAGE_SELECTORS+=("$2")
			shift 2
			;;
		--packages)
			if [ -z "$2" ]; then
				echo -e "${RED}Missing value for --packages${NC}"
				exit 1
			fi
			IFS=',' read -r -a split_packages <<< "$2"
			for pkg in "${split_packages[@]}"; do
				PACKAGE_SELECTORS+=("$pkg")
			done
			shift 2
			;;
		--tag)
			if [ -z "$2" ]; then
				echo -e "${RED}Missing value for --tag${NC}"
				exit 1
			fi
			TAG="$2"
			shift 2
			;;
		--no-publish)
			DO_PUBLISH=false
			shift
			;;
		-h|--help)
			print_usage
			exit 0
			;;
		*)
			echo -e "${RED}Unknown option: $1${NC}"
			print_usage
			exit 1
			;;
	esac
done

if [ -n "$MATRIX_PACKAGE" ]; then
	PACKAGE_SELECTORS+=("$MATRIX_PACKAGE")
fi

if [ -n "$PACKAGES" ]; then
	IFS=',' read -r -a split_env_packages <<< "$PACKAGES"
	for pkg in "${split_env_packages[@]}"; do
		PACKAGE_SELECTORS+=("$pkg")
	done
fi

# Trim spaces + deduplicate selectors
NORMALIZED_SELECTORS=()
for selector in "${PACKAGE_SELECTORS[@]}"; do
	trimmed=$(echo "$selector" | xargs)
	if [ -n "$trimmed" ]; then
		already_seen=false
		for existing in "${NORMALIZED_SELECTORS[@]}"; do
			if [ "$existing" = "$trimmed" ]; then
				already_seen=true
				break
			fi
		done
		if [ "$already_seen" = false ]; then
			NORMALIZED_SELECTORS+=("$trimmed")
		fi
	fi
done

if [ ${#NORMALIZED_SELECTORS[@]} -eq 0 ]; then
	echo -e "${RED}No package selectors provided.${NC}"
	echo -e "${CYAN}Use --package/--packages or MATRIX_PACKAGE/PACKAGES in CI.${NC}"
	exit 1
fi

echo -e "${CYAN}Selecting requested packages...${NC}"
for selector in "${NORMALIZED_SELECTORS[@]}"; do
	matched=false
	for ((j=0; j<${#PKG_DIRS[@]}; j++)); do
		if [ "$selector" = "${PKG_DIRS[$j]}" ] || [ "$selector" = "${PKG_NAMES[$j]}" ]; then
			SELECTED_INDICES+=("$j")
			matched=true
			break
		fi
	done

	if [ "$matched" = false ]; then
		echo -e "${RED}Package selector not found: $selector${NC}"
		echo -e "${CYAN}Available selectors (dir -> name):${NC}"
		for ((k=0; k<${#PKG_DIRS[@]}; k++)); do
			echo -e " - ${PKG_DIRS[$k]} -> ${PKG_NAMES[$k]}"
		done
		exit 1
	fi
done

# Deduplicate selected indices in case the same package was provided by dir+name
UNIQUE_SELECTED_INDICES=()
for idx in "${SELECTED_INDICES[@]}"; do
	exists=false
	for unique_idx in "${UNIQUE_SELECTED_INDICES[@]}"; do
		if [ "$idx" -eq "$unique_idx" ]; then
			exists=true
			break
		fi
	done
	if [ "$exists" = false ]; then
		UNIQUE_SELECTED_INDICES+=("$idx")
	fi
done
SELECTED_INDICES=("${UNIQUE_SELECTED_INDICES[@]}")

echo -e "\n${CYAN}Selected packages:${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
	echo " - ${PKG_NAMES[$idx]} (dir: ${PKG_DIRS[$idx]}, current: ${PKG_VERSIONS[$idx]})"
done
echo -e "${CYAN}Snapshot tag: ${TAG}${NC}"

# Backup package.json files before any changes
echo -e "\n${CYAN}Backing up package.json files...${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
	d="packages/${PKG_DIRS[$idx]}"
	echo "Backing up $d/package.json"
	cp "$d/package.json" "$d/package.json.bak"
done

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
	filename=".changeset/snapshot-temp-${safe_name}-$(date +%s)-$RANDOM.md"

	# We use 'patch' bump to ensure the snapshot increments from the current version.
	echo -e "Creating changeset for ${name} (current version: ${PKG_VERSIONS[$idx]})"
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

echo -e "\n${GREEN}Snapshot versioning complete!${NC}"

# Check for 0.0.0 issue
echo -e "\n${CYAN}Verifying package versions...${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
	d="packages/${PKG_DIRS[$idx]}"
	pkg_name="${PKG_NAMES[$idx]}"
	current_version=$(node -p "require('./$d/package.json').version")
	if [[ "$current_version" == "0.0.0"* ]]; then
		echo -e "${RED}WARNING: Package $pkg_name has version $current_version${NC}"
	else
		echo -e "${GREEN}Package $pkg_name has version $current_version${NC}"
	fi
done

echo -e "\n${CYAN}Building selected packages...${NC}"
for idx in "${SELECTED_INDICES[@]}"; do
	pkg_name="${PKG_NAMES[$idx]}"
	echo -e "Building ${pkg_name}..."
	yarn workspace "$pkg_name" run build
done

if [ "$DO_PUBLISH" = true ]; then
	echo -e "\n${CYAN}Publishing with tag '${TAG}'...${NC}"
	yarn changeset publish --tag "$TAG"
	echo -e "\n${GREEN}Publish complete!${NC}"
else
	echo -e "\n${CYAN}Publish skipped (--no-publish).${NC}"
	echo -e "You can publish manually with: yarn changeset publish --tag ${TAG}"
fi

# Cleanup implied by trap EXIT
echo -e "${GREEN}Done.${NC}"
