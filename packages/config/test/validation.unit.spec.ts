import 'reflect-metadata';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BaseConfig, loadConfig } from '../src/index.js';

describe('Config Validation Unit Tests', () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let dirPath: string;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'config-validation-test-'));
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fs.rmSync(dirPath, { recursive: true, force: true });
  });

  it('should throw Error when required fields are missing', () => {
    fs.writeFileSync(path.join(dirPath, 'default.config.json'), JSON.stringify({}));

    expect(() => loadConfig(dirPath, BaseConfig)).toThrow(/Invalid config/);
  });

  it('should throw Error when validation decorators fail (e.g. wrong type)', () => {
    fs.writeFileSync(
      path.join(dirPath, 'default.config.json'),
      JSON.stringify({ port: 'not-a-number' }),
    );

    expect(() => loadConfig(dirPath, BaseConfig)).toThrow(/Invalid config/);
  });

  it('should warn when a config file is invalid JSON', () => {
    fs.writeFileSync(path.join(dirPath, 'default.config.json'), '{invalid}', 'utf-8');

    expect(() => loadConfig(dirPath, BaseConfig)).toThrow(/Invalid config/);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not read'));
  });

  it('should handle missing files gracefully by returning empty object (and then failing validation if needed)', () => {
    expect(() => loadConfig(dirPath, BaseConfig)).toThrow(/Invalid config/);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
