import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@volontariapp/logger';
import {
  configureLogger,
  FALLBACK_LOG_LEVEL,
  LoggerConfig,
  LoggerFormat,
  parseLogLevel,
} from '../src/index.js';

const buildLoggerConfig = (level: string, format = LoggerFormat.JSON): LoggerConfig => {
  const config = new LoggerConfig();
  config.level = level;
  config.format = format;
  return config;
};

describe('configureLogger', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    Logger.resetDefaultConfig();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Logger.resetDefaultConfig();
  });

  it('applies the configured format and level to the default config', () => {
    const applied = configureLogger(buildLoggerConfig('warn'));

    expect(applied).toBe('warn');
    expect(Logger.getDefaultConfig()).toMatchObject({ format: 'json', minLevel: 'warn' });
  });

  it('keeps the extra settings of the service', () => {
    configureLogger(buildLoggerConfig('info'), { context: 'OUTBOX-WS', masking: false });

    expect(Logger.getDefaultConfig()).toMatchObject({
      context: 'OUTBOX-WS',
      masking: false,
      minLevel: 'info',
    });
  });

  it('filters loggers created before the call', () => {
    const createdAtImport = new Logger({ context: 'Library' });

    configureLogger(buildLoggerConfig('info'));
    createdAtImport.debug('dropped');
    createdAtImport.info('kept');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to info and warns on an unknown level', () => {
    const applied = configureLogger(buildLoggerConfig('verbose'));

    expect(applied).toBe(FALLBACK_LOG_LEVEL);
    expect(Logger.getDefaultConfig().minLevel).toBe('info');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('accepts a level in any case and with spaces', () => {
    expect(configureLogger(buildLoggerConfig(' ERROR '))).toBe('error');
  });
});

describe('parseLogLevel', () => {
  it('returns undefined for an empty or unknown value', () => {
    expect(parseLogLevel(undefined)).toBeUndefined();
    expect(parseLogLevel('')).toBeUndefined();
    expect(parseLogLevel('trace')).toBeUndefined();
  });

  it('returns each known level', () => {
    expect(['debug', 'info', 'warn', 'error', 'fatal'].map((level) => parseLogLevel(level))).toEqual(
      ['debug', 'info', 'warn', 'error', 'fatal'],
    );
  });
});
