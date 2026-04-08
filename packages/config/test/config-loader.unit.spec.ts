import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BaseConfig } from '../src/base-config.js';
import { loadConfig } from '../src/config-loader.js';

type TestConfig = {
  db: {
    host: string;
    port: number;
  };
  redis: {
    host: string;
    port: number;
  };
  clement?: {
    thomas?: {
      lucas?: {
        value?: string;
      };
    };
  };
};

describe('config-loader', () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let dirPath: string;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'config-loader-test-'));

    process.env.DB_HOST = 'env-db-host';
    process.env.DB_PORT = '5432';
    process.env.REDIS_HOST = 'env-redis-host';
    process.env.REDIS_PORT = '6379';
    process.env.CLEMENT_LUCAS_VALUE = '3';
    process.env.MS_POST_URL = 'http://post';
    process.env.MS_USER_URL = 'http://user';
    process.env.MS_EVENT_URL = 'http://event';
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fs.rmSync(dirPath, { recursive: true, force: true });
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.CLEMENT_LUCAS_VALUE;
    delete process.env.MS_POST_URL;
    delete process.env.MS_USER_URL;
    delete process.env.MS_EVENT_URL;
  });

  it('resolves env names in custom config and merges over defaults', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        redis: { host: 'default-redis', port: 6379 },
        port: 3000,
        microServices: {
          msPostUrl: 'http://post',
          msUserUrl: 'http://user',
          msEventUrl: 'http://event',
        },
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'DB_HOST' },
        redis: { host: 'REDIS_HOST' },
      }),
      'utf-8',
    );

    const result = loadConfig<TestConfig>(dirPath, BaseConfig);

    expect(result).toEqual({
      db: { host: 'env-db-host', port: 5432 },
      redis: { host: 'env-redis-host', port: 6379 },
      port: 3000,
      microServices: {
        msPostUrl: 'http://post',
        msUserUrl: 'http://user',
        msEventUrl: 'http://event',
      },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('resolves deeply nested env names in custom config objects', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        redis: { host: 'default-redis', port: 6379 },
        port: 3000,
        microServices: {
          msPostUrl: 'http://post',
          msUserUrl: 'http://user',
          msEventUrl: 'http://event',
        },
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        clement: {
          thomas: {
            lucas: {
              value: 'CLEMENT_LUCAS_VALUE',
            },
          },
        },
      }),
      'utf-8',
    );

    const result = loadConfig<TestConfig>(dirPath, BaseConfig);

    expect(result.clement?.thomas?.lucas?.value).toBe('3');
  });

  it('returns default config when custom file cannot be read', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        redis: { host: 'default-redis', port: 6379 },
        port: 3000,
        microServices: {
          msPostUrl: 'http://post',
          msUserUrl: 'http://user',
          msEventUrl: 'http://event',
        },
      }),
      'utf-8',
    );

    const result = loadConfig<TestConfig>(dirPath, BaseConfig);

    expect(result).toEqual({
      db: { host: 'default-db', port: 5432 },
      redis: { host: 'default-redis', port: 6379 },
      port: 3000,
      microServices: {
        msPostUrl: 'http://post',
        msUserUrl: 'http://user',
        msEventUrl: 'http://event',
      },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${dirPath}/custom-env-vars.json`),
    );
  });

  it('returns custom config when default file contains invalid JSON', () => {
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'DB_HOST', port: 'DB_PORT' },
        redis: { host: 'REDIS_HOST', port: 'REDIS_PORT' },
        port: 3000,
        microServices: {
          msPostUrl: 'MS_POST_URL',
          msUserUrl: 'MS_USER_URL',
          msEventUrl: 'MS_EVENT_URL',
        },
      }),
      'utf-8',
    );
    fs.writeFileSync(path.join(dirPath, 'default.config.json'), '{invalid-json', 'utf-8');

    const result = loadConfig<TestConfig>(dirPath, BaseConfig);

    expect(result).toEqual({
      db: { host: 'env-db-host', port: '5432' },
      redis: { host: 'env-redis-host', port: '6379' },
      port: 3000,
      microServices: {
        msPostUrl: 'http://post',
        msUserUrl: 'http://user',
        msEventUrl: 'http://event',
      },
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${dirPath}/default.config.json`));
  });

  it('throws when required schema fields are missing from both JSON files', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        port: 3000,
        microServices: {
          msPostUrl: 'http://post',
          msUserUrl: 'http://user',
          msEventUrl: 'http://event',
        },
        redis: undefined,
      }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'DB_HOST', port: 'DB_PORT' },
        port: 3000,
        microServices: {
          msPostUrl: 'http://post',
          msUserUrl: 'http://user',
          msEventUrl: 'http://event',
        },
      }),
      'utf-8',
    );

    expect(() => {
      loadConfig<TestConfig>(dirPath, BaseConfig);
    }).toThrow(/redis/);
  });

  it('throws when a required nested field resolves to undefined', () => {
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'MISSING_DB_HOST', port: 'DB_PORT' },
        redis: { host: 'REDIS_HOST', port: 'REDIS_PORT' },
        port: 3000,
        microServices: {
          msPostUrl: 'http://post',
          msUserUrl: 'http://user',
          msEventUrl: 'http://event',
        },
      }),
      'utf-8',
    );

    expect(() => {
      loadConfig<TestConfig>(dirPath, BaseConfig);
    }).toThrow(/db|host|Invalid config/);
  });
});
