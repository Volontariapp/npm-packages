const { execSync } = require('child_process');
const path = require('path');

const ADMIN_FILES = ['package.json', 'CHANGELOG.md'];

/**
 * Identify packs that have meaningful (non-admin) staged changes.
 */
function getModifiedPackages() {
  try {
    const stagedFilesOutput = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    const stagedFiles = stagedFilesOutput.split('\n').filter(Boolean);

    const modifiedPackages = new Set();

    stagedFiles.forEach((file) => {
      if (file.startsWith('packages/')) {
        const parts = file.split('/');
        const pkgName = parts[1];
        const fileName = parts.slice(2).join('/');

        if (!ADMIN_FILES.includes(fileName)) {
          modifiedPackages.add(pkgName);
        }
      } else {
        modifiedPackages.add('root');
      }
    });

    return modifiedPackages;
  } catch (err) {
    return null;
  }
}

const modifiedPackages = getModifiedPackages();

function filterFiles(files) {
  if (!modifiedPackages) return files;

  return files.filter((file) => {
    const relativePath = path.relative(process.cwd(), file);

    if (relativePath.startsWith('packages/')) {
      const pkgName = relativePath.split('/')[1];
      return modifiedPackages.has(pkgName);
    }

    return modifiedPackages.has('root');
  });
}

module.exports = {
  '*.{ts,js,mjs,cjs}': (files) => {
    const filtered = filterFiles(files);
    if (filtered.length === 0) return [];

    const filesString = filtered.map((f) => `"${f}"`).join(' ');
    return [`eslint --fix ${filesString}`, `prettier --write ${filesString}`];
  },
  '*.json': (files) => {
    const filtered = filterFiles(files);
    if (filtered.length === 0) return [];

    const filesString = filtered.map((f) => `"${f}"`).join(' ');
    return [`prettier --write ${filesString}`];
  },
  'CHANGELOG.md': (files) => {
    const filtered = filterFiles(files);
    if (filtered.length === 0) return [];

    const filesString = filtered.map((f) => `"${f}"`).join(' ');
    return [`node scripts/resolve-changelog.js ${filesString}`];
  },
};
