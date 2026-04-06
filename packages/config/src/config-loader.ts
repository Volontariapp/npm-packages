import * as fs from 'fs';
import type { BaseConfig } from './base-config.js';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function LoadJSONFile<T extends BaseConfig>(filePath: string): Partial<T> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as Partial<T>;
  } catch (error) {
    console.warn(`Could not read ${filePath}: ${getErrorMessage(error)}`);
    return {};
  }
}

function mergeConfigs<T extends BaseConfig>(
  defaultConfig: Partial<T>,
  customEnvVars: Partial<T>,
): T {
  return { ...defaultConfig, ...customEnvVars } as T;
}

function findUndefinedPaths(value: unknown, path = ''): string[] {
  const undefinedPaths: string[] = [];

  // Iterative depth-first traversal using a stack to avoid recursion.
  const stack: Array<{ val: unknown; p: string }> = [{ val: value, p: path }];

  while (stack.length > 0) {
    const { val, p } = stack.pop() as { val: unknown; p: string };

    if (val === undefined) {
      undefinedPaths.push(p || '(root)');
      continue;
    }

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        stack.push({ val: val[i], p: `${p}[${i}]` });
      }
      continue;
    }

    if (val !== null && typeof val === 'object') {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        const nextPath = p ? `${p}.${k}` : k;
        stack.push({ val: v, p: nextPath });
      }
      continue;
    }
  }

  return undefinedPaths;
}

function resolveEnvVarValues(value: unknown): unknown {
  if (typeof value === 'string') {
    return process.env[value];
  }

  if (Array.isArray(value)) {
    return value.map(resolveEnvVarValues);
  }

  if (value !== null && typeof value === 'object') {
    const resolvedEntries = Object.entries(value).map(([key, nestedValue]) => [
      key,
      resolveEnvVarValues(nestedValue),
    ]);

    return Object.fromEntries(resolvedEntries);
  }

  return value;
}

/**
 * Loads configuration files from a directory and merges them.
 *
 * `default.config.json` contains direct config values.
 * `custom-env-vars.json` contains environment variable names; each string value is
 * resolved from `process.env` and then merged over the default config.
 *
 * @param {string} dirPath - The directory containing the .json configuration files.
 * @returns {T} The merged configuration object.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- Generic return type is intentional for caller-typed config.
export function loadConfig<T extends BaseConfig>(dirPath: string): T {
  const customEnvVarsPath = `${dirPath}/custom-env-vars.json`;
  const defaultConfigPath = `${dirPath}/default.config.json`;

  let customEnvVars: Partial<T> = {};
  let defaultConfig: Partial<T> = {};

  try {
    customEnvVars = resolveEnvVarValues(LoadJSONFile<T>(customEnvVarsPath)) as Partial<T>;
  } catch (error) {
    console.warn(`Could not read ${customEnvVarsPath}: ${getErrorMessage(error)}`);
  }

  try {
    defaultConfig = {
      ...LoadJSONFile<T>(defaultConfigPath),
    };
  } catch (error) {
    console.warn(`Could not read ${defaultConfigPath}: ${getErrorMessage(error)}`);
  }

  const config = mergeConfigs(defaultConfig, customEnvVars);

  // Validate for any `undefined` values and throw with a list of their paths.
  const undefinedPaths = findUndefinedPaths(config as unknown);
  if (undefinedPaths.length > 0) {
    throw new Error(`Undefined config values: ${undefinedPaths.join(', ')}`);
  }

  return config;
}
