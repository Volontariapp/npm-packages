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

  return config;
}
