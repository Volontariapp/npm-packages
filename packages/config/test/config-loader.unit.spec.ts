import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
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
    process.env.REDIS_HOST = 'env-redis-host';
    process.env.CLEMENT_LUCAS_VALUE = '3';
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fs.rmSync(dirPath, { recursive: true, force: true });
    delete process.env.DB_HOST;
    delete process.env.REDIS_HOST;
    delete process.env.CLEMENT_LUCAS_VALUE;
  });

  it('resolves env names in custom config and merges over defaults', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        redis: { host: 'default-redis', port: 6379 },
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

    const result = loadConfig<TestConfig>(dirPath);

    expect(result).toEqual({
      db: { host: 'env-db-host', port: 5432 },
      redis: { host: 'env-redis-host', port: 6379 },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('resolves deeply nested env names in custom config objects', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        redis: { host: 'default-redis', port: 6379 },
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

    const result = loadConfig<TestConfig>(dirPath);

    expect(result.clement?.thomas?.lucas?.value).toBe('3');
  });

  it('returns default config when custom file cannot be read', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({
        db: { host: 'default-db', port: 5432 },
        redis: { host: 'default-redis', port: 6379 },
      }),
      'utf-8',
    );

    const result = loadConfig<TestConfig>(dirPath);

    expect(result).toEqual({
      db: { host: 'default-db', port: 5432 },
      redis: { host: 'default-redis', port: 6379 },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${dirPath}/custom-env-vars.json`),
    );
  });

  it('returns custom config when default file contains invalid JSON', () => {
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'DB_HOST' },
        redis: { host: 'REDIS_HOST' },
      }),
      'utf-8',
    );
    fs.writeFileSync(path.join(dirPath, 'default.config.json'), '{invalid-json', 'utf-8');

    const result = loadConfig<TestConfig>(dirPath);

    expect(result).toEqual({
      db: { host: 'env-db-host' },
      redis: { host: 'env-redis-host' },
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${dirPath}/default.config.json`));
  });

  it('throws when merged config contains undefined values', () => {
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { host: 'DB_HOST', password: 'DB_PASSWORD' },
      }),
      'utf-8',
    );

    expect(() => {
      loadConfig<TestConfig>(dirPath);
    }).toThrow(/db\.password/);
  });

  it('lists multiple undefined values in the error message', () => {
    fs.writeFileSync(
      path.join(dirPath, 'custom-env-vars.json'),
      JSON.stringify({
        db: { password: 'DB_PASSWORD' },
        clement: { thomas: { lucas: { value: 'MISSING_VAR' } } },
      }),
      'utf-8',
    );

    try {
      loadConfig<TestConfig>(dirPath);
      // If no error thrown, fail the test explicitly
      throw new Error('Expected loadConfig to throw due to undefined values');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const msg = (err as Error).message;
      expect(msg).toMatch(/db\.password/);
      expect(msg).toMatch(/clement\.thomas\.lucas\.value/);
    }
  });
});
