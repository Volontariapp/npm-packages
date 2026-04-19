import fs from 'node:fs';
import path from 'node:path';

/**
 * This script resolves all "workspace:*" or "workspace:^" dependencies to their actual current versions.
 * It is called by the CI just before publishing to ensure that the manifests sent to the registry
 * are valid and point to the correct internal versions (especially for snapshots).
 */

const packagesDir = 'packages';
const pkgDirs = fs.readdirSync(packagesDir).filter(dir => {
  const fullPath = path.join(packagesDir, dir);
  return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'));
});

const pkgVersions = {};

// 1. Build a map of all workspace packages and their current versions
pkgDirs.forEach(dir => {
  const pkg = JSON.parse(fs.readFileSync(path.join(packagesDir, dir, 'package.json'), 'utf8'));
  pkgVersions[pkg.name] = pkg.version;
});

console.log('--- Workspace Dependency Resolution ---');

// 2. Update all dependencies in all package.json files
pkgDirs.forEach(dir => {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let changed = false;

  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
    if (!pkg[depType]) return;

    Object.keys(pkg[depType]).forEach(depName => {
      const depUrl = pkg[depType][depName];
      if (depUrl.startsWith('workspace:')) {
        const actualVersion = pkgVersions[depName];
        if (actualVersion) {
            console.log(`  [${pkg.name}] resolving ${depName}: ${depUrl} -> ${actualVersion}`);
            pkg[depType][depName] = actualVersion;
            changed = true;
        } else {
            console.warn(`  [${pkg.name}] Warning: could not find workspace version for ${depName}`);
        }
      }
    });
  });

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
});

console.log('--- Resolution Complete ---');
