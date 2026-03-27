const fs = require('fs');
const path = require('path');

const packagesRoot = 'packages';
const packagesDirs = fs.readdirSync(packagesRoot)
  .filter(dir => {
    const pkgPath = path.join(packagesRoot, dir);
    if (!fs.statSync(pkgPath).isDirectory()) return false;
    const pkgJson = path.join(pkgPath, 'package.json');
    return fs.existsSync(pkgJson);
  });

const packageMap = new Map();
const dirToName = new Map();

packagesDirs.forEach(dir => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(packagesRoot, dir, 'package.json'), 'utf8'));
  const allDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  packageMap.set(pkgJson.name, {
    dir,
    dependencies: allDeps
  });
  dirToName.set(dir, pkgJson.name);
});

const sortedMap = new Map();
const visiting = new Set();

function topoSort(pkgName) {
  if (sortedMap.has(pkgName)) return;
  if (visiting.has(pkgName)) return;

  visiting.add(pkgName);
  const info = packageMap.get(pkgName);
  if (info) {
    Object.keys(info.dependencies).forEach(dep => {
      if (packageMap.has(dep)) topoSort(dep);
    });
    if (!Array.from(sortedMap.keys()).includes(pkgName)) {
      sortedMap.set(pkgName, info.dir);
    }
  }
  visiting.delete(pkgName);
}

const inputArgs = process.argv.slice(2).join(' ');
let inputDirs = [];
try {
  inputDirs = JSON.parse(inputArgs);
} catch (e) {
  inputDirs = inputArgs.split(' ').filter(String);
}

inputDirs.forEach(dir => {
  const name = dirToName.get(dir);
  if (name) topoSort(name);
});

process.stdout.write(JSON.stringify(Array.from(sortedMap.values())));
