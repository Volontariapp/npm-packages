import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Logger } from '../../logger.js';

interface LogPayload {
  level?: string;
  context?: string;
  message?: string;
  timestamp?: string;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

describe('Logger', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('JSON Format', () => {
    it('should log debug message with json format', () => {
      const logger = new Logger({ format: 'json', context: 'TestContext', minLevel: 'debug' });
      logger.debug('A debug message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleLogSpy.mock.calls[0] as string[];
      const payload = JSON.parse(callArgs[0]) as LogPayload;

      expect(payload).toMatchObject({
        level: 'debug',
        context: 'TestContext',
        message: 'A debug message',
      });
      expect(typeof payload.timestamp).toBe('string');
    });

    it('should handle optional objects as metadata', () => {
      const logger = new Logger({ format: 'json', context: 'Sys' });
      logger.info('System startup', { port: 3000, host: 'localhost' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse((consoleLogSpy.mock.calls[0] as string[])[0]) as LogPayload;

      expect(payload).toMatchObject({
        level: 'info',
        context: 'Sys',
        message: 'System startup',
        port: 3000,
        host: 'localhost',
      });
    });

    it('should correctly handle NestJS-style context overriding', () => {
      const logger = new Logger({ format: 'json' });
      logger.error('Database connection failed', 'TypeOrm');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse((consoleErrorSpy.mock.calls[0] as string[])[0]) as LogPayload;

      expect(payload).toMatchObject({
        level: 'error',
        context: 'TypeOrm',
      });
      expect(payload.message).toContain('Database connection failed');
    });

    it('should format errors gracefully', () => {
      const logger = new Logger({ format: 'json' });
      const err = new Error('Unexpected crash');
      logger.fatal('Service died', err);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse((consoleErrorSpy.mock.calls[0] as string[])[0]) as LogPayload;

      expect(payload.level).toBe('fatal');
      expect(payload.error).toBe('Unexpected crash');
      expect(typeof payload.stack).toBe('string');
    });
  });

  describe('Text Format (Colors)', () => {
    it('should log colored string without error parsing', () => {
      const logger = new Logger({ format: 'text', context: 'HTTP' });
      logger.info('Request received');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = (consoleLogSpy.mock.calls[0] as string[])[0];

      expect(output).toContain('[INFO]');
      expect(output).toContain('[HTTP]');
      expect(output).toContain('Request received');
    });
  });

  describe('Log Levels filtering', () => {
    it('should skip logs below minLevel', () => {
      const logger = new Logger({ minLevel: 'warn' });
      logger.debug('Debug ignored');
      logger.info('Info ignored');
      logger.warn('Warn logged');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
