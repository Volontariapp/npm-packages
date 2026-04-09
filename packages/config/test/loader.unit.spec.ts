import 'reflect-metadata';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  BaseConfig,
  BackendConfig,
  NodeEnv,
  loadConfig,
  LoggerFormat,
  PostgresConfig,
} from '../src/index.js';

describe('Config Loader Unit Tests', () => {
  let dirPath: string;
  const originalEnv = { ...process.env };

  const validAuth = {
    internalPublicKeyPath: 'k',
    internalPrivateKeyPath: 'k',
    accessTokenPublicKeyPath: 'k',
    accessTokenPrivateKeyPath: 'k',
    refreshTokenPublicKeyPath: 'k',
    refreshTokenPrivateKeyPath: 'k',
    internalExpiresIn: '1h',
    accessTokenExpiresIn: '1h',
    refreshTokenExpiresIn: '1h',
  };

  const validLogger = { level: 'info', format: LoggerFormat.JSON };

  const validMicroservices = { msUserUrl: 'u', msPostUrl: 'p', msEventUrl: 'e' };

  beforeEach(() => {
    dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'config-loader-test-'));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    fs.rmSync(dirPath, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it('should load default.config.json', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        port: 3000,
        logger: validLogger,
        auth: validAuth,
        microServices: validMicroservices,
      }),
    );

    const config = loadConfig(dirPath, BackendConfig);
    expect(config.port).toBe(3000);
  });

  it('should override with environment-specific config', () => {
    process.env['NODE_ENV'] = 'production';

    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        port: 3000,
        logger: validLogger,
        auth: validAuth,
        microServices: validMicroservices,
      }),
    );

    fs.writeFileSync(
      path.join(dirPath, 'production.config.json'),
      JSON.stringify({
        port: 8080,
      }),
    );

    const config = loadConfig(dirPath, BackendConfig);
    expect(config.port).toBe(8080);
    expect(config.nodeEnv).toBe(NodeEnv.PRODUCTION);
  });

  it('should resolve environment variables via custom-env-vars.json', () => {
    process.env['MS_USER_URL'] = 'http://resolved-user';

    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        port: 3000,
        nodeEnv: NodeEnv.DEVELOPMENT,
        logger: validLogger,
        auth: validAuth,
        microServices: { ...validMicroservices, msUserUrl: 'default' },
      }),
    );

    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        microServices: { msUserUrl: 'MS_USER_URL' },
      }),
    );

    const config = loadConfig(dirPath, BackendConfig);
    expect(config.microServices.msUserUrl).toBe('http://resolved-user');
  });

  class TestConfig extends BackendConfig {
    @IsDefined()
    @ValidateNested()
    @Type(() => PostgresConfig)
    db!: PostgresConfig;
  }

  it('should handle complex deep merges with extended config', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        port: 3000,
        logger: validLogger,
        auth: validAuth,
        microServices: validMicroservices,
        db: {
          host: 'localhost',
          port: 5432,
          username: 'u',
          password: 'p',
          database: 'd',
          maxPoolSize: 10,
          ssl: false,
        },
      }),
    );

    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'DB_HOST' },
      }),
    );

    process.env['DB_HOST'] = 'prod-db';

    const config = loadConfig(dirPath, TestConfig);
    expect(config.db.host).toBe('prod-db');
    expect(config.db.port).toBe(5432);
  });

  it('should resolve environment variables in nested arrays', () => {
    process.env['ARR_VAL_1'] = 'val1';

    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        port: 3000,
        nodeEnv: NodeEnv.DEVELOPMENT,
        logger: validLogger,
      }),
    );

    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        list: [['ARR_VAL_1']],
      }),
    );

    class NestedArrayConfig extends BaseConfig {
      list?: string[][];
    }

    const config = loadConfig(dirPath, NestedArrayConfig);
    expect(config.list?.[0]?.[0]).toBe('val1');
  });

  it('should handle null values in resolveEnvVarValues', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        port: 3000,
        nodeEnv: NodeEnv.DEVELOPMENT,
        logger: validLogger,
      }),
    );

    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        something: null,
      }),
    );

    class NullConfig extends BaseConfig {
      something?: unknown;
    }

    const config = loadConfig(dirPath, NullConfig);
    expect(config.something).toBeNull();
  });
});
