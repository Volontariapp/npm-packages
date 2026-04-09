import * as fs from 'fs';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { BaseConfig } from './configs/base-config.js';
import { Logger } from '@volontariapp/logger';

const logger = new Logger({ context: 'ConfigLoader', format: 'json' });

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function LoadJSONFile<T extends object>(filePath: string): Partial<T> {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as Partial<T>;
  } catch (error) {
    logger.warn(`Could not read ${filePath}: ${getErrorMessage(error)}`);
    return {};
  }
}

/**
 * Deep merge multiple objects.
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge multiple objects.
 */
function deepMerge<T extends object>(...objects: Partial<T>[]): T {
  const result = {} as Record<string, unknown>;
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, unknown>)[key];
      const prevVal = result[key];
      if (isObject(val) && isObject(prevVal)) {
        result[key] = deepMerge(prevVal, val);
      } else {
        result[key] = val;
      }
    }
  }
  return result as T;
}

function validateConfigOrThrow<T extends BaseConfig>(
  value: unknown,
  schema: ClassConstructor<T>,
): void {
  const instance = plainToInstance(schema, value, {
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
    throw new Error(`Invalid config: ${JSON.stringify(errors, null, 2)}`);
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

export function loadConfig<T extends BaseConfig>(dirPath: string, schema: ClassConstructor<T>): T {
  const nodeEnv = (process.env['NODE_ENV'] ?? 'development').toLowerCase();

  const defaultConfig = LoadJSONFile<T>(`${dirPath}/default.config.json`);
  const envConfig = LoadJSONFile<T>(`${dirPath}/${nodeEnv}.config.json`);
  const localConfig = LoadJSONFile<T>(`${dirPath}/local.config.json`);
  const customEnvMapping = LoadJSONFile<T>(`${dirPath}/custom-env-vars.json`);
  const customEnvVars = resolveEnvVarValues(customEnvMapping) as Partial<T>;

  const config = deepMerge<T>(
    { nodeEnv } as unknown as Partial<T>,
    defaultConfig,
    envConfig,
    localConfig,
    customEnvVars,
  );

  validateConfigOrThrow(config, schema);

  return plainToInstance(schema, config, { enableImplicitConversion: true });
}
