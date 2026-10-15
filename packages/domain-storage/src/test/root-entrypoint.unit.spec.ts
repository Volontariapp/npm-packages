import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from '@jest/globals';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELATIVE_IMPORT = /(?:from|import)\s+['"](\.{1,2}\/[^'"]+)\.js['"]/g;

/** Every package or relative specifier reachable from a source file, transitively. */
const collectSpecifiers = (entry: string): { files: Set<string>; packages: Set<string> } => {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (files.has(file)) continue;
    files.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(RELATIVE_IMPORT)) {
      queue.push(resolve(dirname(file), `${match[1]}.ts`));
    }
    for (const match of source.matchAll(/(?:from|import)\s+['"]([^./'"][^'"]*)['"]/g)) {
      packages.add(match[1]);
    }
  }
  return { files, packages };
};

describe('Root entry point', () => {
  const { files } = collectSpecifiers(resolve(SRC_DIR, 'index.ts'));

  it('re-exports models and repositories from root', () => {
    const reachedModels = [...files].filter((file) => file.includes('/models/'));
    expect(reachedModels.length).toBeGreaterThan(0);

    const reachedRepos = [...files].filter((file) => file.includes('/repositories/'));
    expect(reachedRepos.length).toBeGreaterThan(0);
  });
});

describe('Helpers entry point', () => {
  const { packages } = collectSpecifiers(resolve(SRC_DIR, 'helpers/index.ts'));

  it('does not load typeorm, keeping helpers pure for consumers without db', () => {
    expect(packages.has('typeorm')).toBe(false);
    expect(packages.has('reflect-metadata')).toBe(false);
  });
});
