import { describe, it, expect } from '@jest/globals';
import { CIRCULAR_REFERENCE, DEFAULT_REDACTION, Masker } from '../../masking.js';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

describe('Masker', () => {
  describe('keys', () => {
    it('should mask sensitive keys whatever their casing or separators', () => {
      const masked = new Masker().mask({
        password: 'hunter2',
        'x-internal-token': 'abc',
        Authorization: 'Bearer abc',
        refresh_token: 'def',
        userEmail: 'jane@example.com',
        phoneNumber: '0612345678',
      });

      expect(masked).toEqual({
        password: DEFAULT_REDACTION,
        'x-internal-token': DEFAULT_REDACTION,
        Authorization: DEFAULT_REDACTION,
        refresh_token: DEFAULT_REDACTION,
        userEmail: DEFAULT_REDACTION,
        phoneNumber: DEFAULT_REDACTION,
      });
    });

    it('should keep non sensitive keys untouched', () => {
      const input = { port: 3000, host: 'localhost', ok: true, nothing: null };

      expect(new Masker().mask(input)).toEqual(input);
    });

    it('should accept extra keys and a custom replacement', () => {
      const masker = new Masker({ keys: ['ssn'], replacement: '***' });

      expect(masker.mask({ SSN: '123', password: 'x' })).toEqual({ SSN: '***', password: '***' });
    });
  });

  describe('patterns', () => {
    it('should mask emails and JWTs found inside strings', () => {
      const masked = new Masker().maskString(`user jane.doe+tag@example.co.uk sent ${JWT}`);

      expect(masked).toBe(`user ${DEFAULT_REDACTION} sent ${DEFAULT_REDACTION}`);
    });

    it('should mask bearer credentials', () => {
      expect(new Masker().maskString('header Bearer abc.def-123')).toBe(
        `header ${DEFAULT_REDACTION}`,
      );
    });

    it('should accept extra patterns, even without the global flag', () => {
      const masker = new Masker({ patterns: [/\d{4}-\d{4}/] });

      expect(masker.maskString('a 1234-5678 b 8765-4321')).toBe(
        `a ${DEFAULT_REDACTION} b ${DEFAULT_REDACTION}`,
      );
    });

    it('should be stable across repeated calls', () => {
      const masker = new Masker();

      expect(masker.maskString('a@b.io')).toBe(DEFAULT_REDACTION);
      expect(masker.maskString('a@b.io')).toBe(DEFAULT_REDACTION);
    });
  });

  describe('nested structures', () => {
    it('should mask recursively in objects and arrays', () => {
      const masked = new Masker().mask({
        request: {
          headers: { authorization: 'secret-value', accept: 'json' },
          users: [
            { id: 1, email: 'a@b.io' },
            { id: 2, note: 'contact c@d.io' },
          ],
        },
      });

      expect(masked).toEqual({
        request: {
          headers: { authorization: DEFAULT_REDACTION, accept: 'json' },
          users: [
            { id: 1, email: DEFAULT_REDACTION },
            { id: 2, note: `contact ${DEFAULT_REDACTION}` },
          ],
        },
      });
    });

    it('should not mutate the original object', () => {
      const input = { password: 'hunter2', nested: { token: 'abc' }, list: ['a@b.io'] };
      const snapshot = JSON.stringify(input);

      new Masker().mask(input);

      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('should mask class instances', () => {
      class UserDto {
        constructor(
          public readonly id: number,
          public readonly email: string,
        ) {}
      }

      expect(new Masker().mask(new UserDto(1, 'a@b.io'))).toEqual({
        id: 1,
        email: DEFAULT_REDACTION,
      });
    });

    it('should mask errors and keep their shape', () => {
      const error = new Error('failed for a@b.io');

      const masked = new Masker().mask(error) as { name: string; message: string };

      expect(masked.name).toBe('Error');
      expect(masked.message).toBe(`failed for ${DEFAULT_REDACTION}`);
    });

    it('should keep dates and primitives', () => {
      const date = new Date('2026-10-07T00:00:00.000Z');

      expect(new Masker().mask({ date, count: 3, flag: false })).toEqual({
        date,
        count: 3,
        flag: false,
      });
    });

    it('should survive circular references', () => {
      const input: Record<string, unknown> = { id: 1 };
      input.self = input;

      expect(new Masker().mask(input)).toEqual({ id: 1, self: CIRCULAR_REFERENCE });
    });

    it('should not flag a shared reference as circular', () => {
      const shared = { id: 1 };

      expect(new Masker().mask({ a: shared, b: shared })).toEqual({ a: shared, b: shared });
    });
  });
});
