import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Logger } from '../../logger.js';
import { DEFAULT_REDACTION } from '../../masking.js';

type LogPayload = Record<string, unknown>;

describe('Logger masking', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const lastOutput = (): string => (consoleLogSpy.mock.calls[0] as string[])[0];

  it('should mask metadata in json format', () => {
    const logger = new Logger({ format: 'json' });

    logger.info('Login', { email: 'jane@example.com', password: 'hunter2', userId: 7 });

    const payload = JSON.parse(lastOutput()) as LogPayload;
    expect(payload).toMatchObject({
      email: DEFAULT_REDACTION,
      password: DEFAULT_REDACTION,
      userId: 7,
    });
    expect(lastOutput()).not.toContain('hunter2');
    expect(lastOutput()).not.toContain('jane@example.com');
  });

  it('should mask metadata in text format', () => {
    const logger = new Logger({ format: 'text' });

    logger.info('Login', { nested: { token: 'abc123' } });

    expect(lastOutput()).toContain(DEFAULT_REDACTION);
    expect(lastOutput()).not.toContain('abc123');
  });

  it('should mask patterns inside the message and error details', () => {
    const logger = new Logger({ format: 'json' });

    logger.error('Failed for jane@example.com', new Error('boom jane@example.com'));

    const output = (consoleErrorSpy.mock.calls[0] as string[])[0];
    expect(output).toContain(DEFAULT_REDACTION);
    expect(output).not.toContain('jane@example.com');
  });

  it('should mask positional params', () => {
    const logger = new Logger({ format: 'json' });

    logger.info('Params', 'a@b.io', 3);

    expect(lastOutput()).not.toContain('a@b.io');
  });

  it('should not mutate the metadata passed by the caller', () => {
    const logger = new Logger({ format: 'json' });
    const meta = { password: 'hunter2' };

    logger.info('Login', meta);

    expect(meta.password).toBe('hunter2');
  });

  it('should apply the configured keys and replacement', () => {
    const logger = new Logger({ format: 'json', masking: { keys: ['ssn'], replacement: '***' } });

    logger.info('Profile', { ssn: '123', password: 'x' });

    expect(JSON.parse(lastOutput())).toMatchObject({ ssn: '***', password: '***' });
  });

  it('should let masking be disabled explicitly', () => {
    const logger = new Logger({ format: 'json', masking: false });

    logger.info('Login', { password: 'hunter2' });

    expect(JSON.parse(lastOutput())).toMatchObject({ password: 'hunter2' });
  });
});
