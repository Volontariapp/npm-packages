import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { trace } from '@opentelemetry/api';
import { AUDIT_ACTIONS } from '../../audit.js';
import { Logger } from '../../logger.js';
import { DEFAULT_REDACTION } from '../../masking.js';
import { TRACE_ID_HEX, createSpanContext } from '../factories/span-context.factory.js';

interface AuditPayload {
  timestamp?: string;
  level?: string;
  status?: string;
  context?: string;
  message?: string;
  audit?: boolean;
  actor?: string;
  action?: string;
  target?: { type?: string; id?: string };
  result?: string;
  [key: string]: unknown;
}

describe('Logger.audit()', () => {
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
    Logger.resetDefaultConfig();
  });

  const lastLogPayload = (): AuditPayload =>
    JSON.parse((consoleLogSpy.mock.calls[0] as string[])[0]) as AuditPayload;

  it('writes one JSON line tagged audit with the actor, action, target and result', () => {
    const logger = new Logger({ format: 'json', context: 'AdminUsers' });

    logger.audit({
      actor: 'admin-1',
      action: 'user.admin_deleted',
      target: { type: 'user', id: 'user-9' },
      result: 'success',
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    const payload = lastLogPayload();
    expect(payload).toMatchObject({
      audit: true,
      level: 'info',
      status: 'info',
      context: 'AdminUsers',
      actor: 'admin-1',
      action: 'user.admin_deleted',
      target: { type: 'user', id: 'user-9' },
      result: 'success',
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  it('is written even when the service only logs warnings and errors', () => {
    const logger = new Logger({ format: 'json', minLevel: 'warn' });

    logger.info('An ordinary info line');
    logger.audit({
      actor: 'admin-1',
      action: 'badge.deleted',
      target: { type: 'badge', id: 'badge-3' },
      result: 'success',
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(lastLogPayload()).toMatchObject({ audit: true, action: 'badge.deleted' });
  });

  it('is written even when the service only logs errors, through the default level too', () => {
    Logger.setDefaultConfig({ format: 'json', minLevel: 'fatal' });
    const logger = new Logger({ context: 'AdminBadges' });

    logger.audit({
      actor: 'admin-1',
      action: 'badge.created',
      target: { type: 'badge', id: 'badge-4' },
      result: 'success',
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(lastLogPayload()).toMatchObject({ audit: true, action: 'badge.created' });
  });

  it('masks an e-mail address put in the actor or the target', () => {
    const logger = new Logger({ format: 'json' });

    logger.audit({
      actor: 'admin@example.com',
      action: 'user.admin_updated',
      target: { type: 'user', id: 'someone@example.com' },
      result: 'denied',
    });

    const payload = lastLogPayload();
    expect(payload.actor).toBe(DEFAULT_REDACTION);
    expect(payload.target?.id).toBe(DEFAULT_REDACTION);
    expect((consoleLogSpy.mock.calls[0] as string[])[0]).not.toContain('example.com');
  });

  it('adds the trace id inside an active span', () => {
    jest
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(trace.wrapSpanContext(createSpanContext()));
    const logger = new Logger({ format: 'json' });

    logger.audit({
      actor: 'admin-1',
      action: 'user.admin_deleted',
      target: { type: 'user', id: 'user-9' },
      result: 'failure',
    });

    expect(lastLogPayload()).toMatchObject({ audit: true, trace_id: TRACE_ID_HEX });
  });

  it('is readable in the text format too', () => {
    const logger = new Logger({ format: 'text', context: 'AdminUsers' });

    logger.audit({
      actor: 'admin-1',
      action: 'user.admin_deleted',
      target: { type: 'user', id: 'user-9' },
      result: 'success',
    });

    const output = (consoleLogSpy.mock.calls[0] as string[])[0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('audit user.admin_deleted');
    expect(output).toContain('"audit": true');
  });

  it('keeps the list of audited actions closed on the five decided ones', () => {
    expect([...AUDIT_ACTIONS]).toEqual([
      'user.admin_deleted',
      'user.admin_updated',
      'badge.created',
      'badge.updated',
      'badge.deleted',
    ]);
  });
});
