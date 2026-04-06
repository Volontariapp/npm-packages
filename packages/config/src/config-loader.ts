import * as fs from 'fs';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BaseConfig } from './base-config.js';

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

/**
 * Deep merge with fallback semantics (iterative, no recursion):
 *
 * Goal:
 * - Keep `customEnvVars` as the source of truth when a value is defined.
 * - Fall back to `defaultConfig` only when the custom value is `undefined`
 *   (typical case when an env var name exists in `custom-env-vars.json` but
 *   the corresponding environment variable is not set).
 *
 * Why not `{ ...defaultConfig, ...customEnvVars }`?
 * - Spread merge is shallow. For nested objects, the whole nested branch from
 *   `customEnvVars` replaces the default one.
 * - Example: `default.db = { host, port }` and `custom.db = { host }`
 *   gives `{ db: { host } }`, so `port` is lost.
 *
 * Strategy:
 * - Traverse both structures with an explicit stack of frames.
 * - Each frame carries `(defaultValue, customValue)` and an `assign` callback
 *   telling where the merged result must be written.
 * - Rules per frame:
 *   1) `customValue === undefined` => keep `defaultValue`.
 *   2) both arrays => merge element by element.
 *   3) both plain objects => merge key by key (union of keys).
 *   4) otherwise => keep `customValue`.
 */
function mergeConfigs<T extends BaseConfig>(
  defaultConfig: Partial<T>,
  customEnvVars: Partial<T>,
): T {
  const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  };

  type Frame = {
    defaultValue: unknown;
    customValue: unknown;
    assign: (value: unknown) => void;
  };

  let mergedConfig: unknown = {};
  const stack: Frame[] = [
    {
      defaultValue: defaultConfig,
      customValue: customEnvVars,
      assign: (value) => {
        mergedConfig = value;
      },
    },
  ];

  while (stack.length > 0) {
    const frame = stack.pop() as Frame;

    if (frame.customValue === undefined) {
      frame.assign(frame.defaultValue);
      continue;
    }

    if (Array.isArray(frame.defaultValue) && Array.isArray(frame.customValue)) {
      const maxLength = Math.max(frame.defaultValue.length, frame.customValue.length);
      const mergedArray = new Array<unknown>(maxLength);
      frame.assign(mergedArray);

      for (let i = 0; i < maxLength; i++) {
        stack.push({
          defaultValue: frame.defaultValue[i],
          customValue: frame.customValue[i],
          assign: (value) => {
            mergedArray[i] = value;
          },
        });
      }

      continue;
    }

    if (isPlainObject(frame.defaultValue) && isPlainObject(frame.customValue)) {
      const mergedObject: Record<string, unknown> = {};
      frame.assign(mergedObject);

      const keys = new Set([...Object.keys(frame.defaultValue), ...Object.keys(frame.customValue)]);

      for (const key of keys) {
        stack.push({
          defaultValue: frame.defaultValue[key],
          customValue: frame.customValue[key],
          assign: (value) => {
            mergedObject[key] = value;
          },
        });
      }

      continue;
    }

    frame.assign(frame.customValue);
  }

  return mergedConfig as T;
}

function validateConfigOrThrow(value: unknown): void {
  const instance = plainToInstance(BaseConfig, value, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(instance, {
    skipMissingProperties: false,
    validationError: {
      target: false,
      value: false,
    },
  });

  if (errors.length > 0) {
    throw new Error(`Invalid config: ${JSON.stringify(errors)}`);
  }
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
  validateConfigOrThrow(config);

  return config;
}
