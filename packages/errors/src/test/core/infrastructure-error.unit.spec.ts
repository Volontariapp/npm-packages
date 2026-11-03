import { describe, it, expect } from '@jest/globals';
import { isInfrastructureError } from '../../core/infrastructure-error.js';
import {
  makeCausedError,
  makeCodedError,
  makeCyclicError,
  makeDriverWrappedError,
  makeNamedError,
} from '../factories/infrastructure-error.factory.js';

describe('isInfrastructureError, Unit', () => {
  describe('Node network error codes', () => {
    it.each(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN'])(
      'should return true for %s',
      (code) => {
        expect(isInfrastructureError(makeCodedError(code))).toBe(true);
      },
    );
  });

  describe('Postgres SQLSTATE codes', () => {
    it.each([
      ['08000', 'connection_exception'],
      ['08001', 'sqlclient_unable_to_establish_sqlconnection'],
      ['08003', 'connection_does_not_exist'],
      ['08006', 'connection_failure'],
      ['57P01', 'admin_shutdown'],
      ['57P02', 'crash_shutdown'],
      ['57P03', 'cannot_connect_now'],
      ['53300', 'too_many_connections'],
    ])('should return true for %s (%s)', (code) => {
      expect(isInfrastructureError(makeCodedError(code))).toBe(true);
    });

    it.each([
      ['23505', 'unique_violation'],
      ['23503', 'foreign_key_violation'],
      ['22P02', 'invalid_text_representation'],
      ['42P01', 'undefined_table'],
      ['40P01', 'deadlock_detected'],
    ])('should return false for business or query error %s (%s)', (code) => {
      expect(isInfrastructureError(makeCodedError(code))).toBe(false);
    });
  });

  describe('plain errors identified by name or message', () => {
    it('should return true for ioredis MaxRetriesPerRequestError', () => {
      expect(isInfrastructureError(makeNamedError('MaxRetriesPerRequestError'))).toBe(true);
    });

    it.each([
      'Connection is closed.',
      'Connection terminated unexpectedly',
      'Connection terminated',
      'Connection terminated due to connection timeout',
      'timeout exceeded when trying to connect',
    ])('should return true for message "%s"', (message) => {
      expect(isInfrastructureError(new Error(message))).toBe(true);
    });
  });

  describe('wrapped errors', () => {
    it('should find the code in driverError (TypeORM QueryFailedError)', () => {
      const error = makeDriverWrappedError(makeCodedError('ECONNREFUSED'));
      expect(isInfrastructureError(error)).toBe(true);
    });

    it('should find the code in cause', () => {
      const error = makeCausedError(makeCodedError('57P01'));
      expect(isInfrastructureError(error)).toBe(true);
    });

    it('should follow several levels of wrapping', () => {
      const error = makeCausedError(makeDriverWrappedError(makeCodedError('08006')));
      expect(isInfrastructureError(error)).toBe(true);
    });

    it('should return false when the wrapped error is a business error', () => {
      const error = makeCausedError(makeDriverWrappedError(makeCodedError('23505')));
      expect(isInfrastructureError(error)).toBe(false);
    });

    it('should terminate on a cyclic cause', () => {
      expect(isInfrastructureError(makeCyclicError())).toBe(false);
    });
  });

  describe('business errors', () => {
    it.each([
      'Event payload is missing a valid string id',
      'Event payload must be a non-null object',
      'Simulated processing error',
    ])('should return false for message "%s"', (message) => {
      expect(isInfrastructureError(new Error(message))).toBe(false);
    });

    it('should return false for a JSON parsing error', () => {
      let parsingError: unknown;
      try {
        JSON.parse('{not json');
      } catch (err) {
        parsingError = err;
      }
      expect(parsingError).toBeInstanceOf(SyntaxError);
      expect(isInfrastructureError(parsingError)).toBe(false);
    });
  });

  describe('non-error values', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['a string equal to a known code', 'ECONNREFUSED'],
      ['an object with a non-string code', { code: 500 }],
    ])('should return false for %s', (_label, value) => {
      expect(isInfrastructureError(value)).toBe(false);
    });
  });
});
