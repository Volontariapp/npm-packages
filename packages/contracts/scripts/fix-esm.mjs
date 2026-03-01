import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir) {
  let results = [];
  const list = readdirSync(dir);
  list.forEach((file) => {
    file = join(dir, file);
    const stat = statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');

files.forEach((file) => {
  const content = readFileSync(file, 'utf-8');
  if (content.includes('import { wrappers } from "protobufjs"')) {
    const fixedContent = content.replace(
      /import { wrappers } from ["']protobufjs["']/g,
      "import _m0 from 'protobufjs'; const { wrappers } = _m0",
    );
    writeFileSync(file, fixedContent);
    console.log(`Fixed ESM imports in ${file}`);
  }
});
