#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACKAGES_DIR="${ROOT_DIR}/packages"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${BLUE}=== Create New Package ===${NC}\n"

read -rp "📦 Package name (e.g. domain-auth): " PACKAGE_NAME

if [ -z "${PACKAGE_NAME}" ]; then
  echo -e "${RED}✖ Package name cannot be empty.${NC}"
  exit 1
fi

if [[ ! "${PACKAGE_NAME}" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo -e "${RED}✖ Invalid name. Use lowercase alphanumeric with hyphens (e.g. domain-auth).${NC}"
  exit 1
fi

PKG_DIR="${PACKAGES_DIR}/${PACKAGE_NAME}"

if [ -d "${PKG_DIR}" ]; then
  echo -e "${RED}✖ Package '${PACKAGE_NAME}' already exists at ${PKG_DIR}${NC}"
  exit 1
fi

TODAY=$(date +%Y-%m-%d)

echo -e "\n${BLUE}Creating package ${GREEN}@volontariapp/${PACKAGE_NAME}${NC}...\n"

mkdir -p "${PKG_DIR}/src"

cat > "${PKG_DIR}/src/index.ts" << 'EOF'
export {};
EOF

cat > "${PKG_DIR}/package.json" << EOF
{
  "name": "@volontariapp/${PACKAGE_NAME}",
  "version": "0.1.0",
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "repository": {
    "type": "git",
    "url": "git@github.com:Volontariapp/npm-packages.git"
  },
  "description": "",
  "license": "UNLICENSED",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "engines": {
    "node": ">=24.14.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src/",
    "test": "echo \"No tests yet\""
  },
  "devDependencies": {
    "typescript": "5.7.3"
  }
}
EOF

cat > "${PKG_DIR}/tsconfig.json" << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "baseUrl": "./"
  },
  "include": ["src"]
}
EOF

cat > "${PKG_DIR}/eslint.config.mjs" << 'EOF'
import config from "@volontariapp/eslint-config";

export default config;
EOF

cat > "${PKG_DIR}/CHANGELOG.md" << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - ${TODAY}

### Added

- Initial package scaffold.

[0.1.0]: https://github.com/Volontariapp/npm-packages/pull/PLACEHOLDER
EOF

echo -e "${GREEN}✔${NC} src/index.ts"
echo -e "${GREEN}✔${NC} package.json"
echo -e "${GREEN}✔${NC} tsconfig.json"
echo -e "${GREEN}✔${NC} eslint.config.mjs"
echo -e "${GREEN}✔${NC} CHANGELOG.md"

echo -e "\n${BLUE}Installing dependencies...${NC}"
(cd "${ROOT_DIR}" && yarn install)

echo -e "\n${GREEN}✅ Package @volontariapp/${PACKAGE_NAME} created successfully!${NC}"
echo -e "${BLUE}   Location: packages/${PACKAGE_NAME}/${NC}"
