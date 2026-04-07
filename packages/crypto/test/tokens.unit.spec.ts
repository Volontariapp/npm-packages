import { generateToken, safeCompare } from '../src/utils/tokens.js';

import { InternalServerError } from '@volontariapp/errors';

describe('tokens', () => {
  it('should generate a token of default length', () => {
    const token = generateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should successfully compare identical strings safely', () => {
    expect(safeCompare('secret', 'secret')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(safeCompare('secret', 'different')).toBe(false);
  });

  it('should return false for different length strings', () => {
    expect(safeCompare('sec', 'secre')).toBe(false);
  });

  it('should throw InternalServerError if generateToken fails', () => {
    expect(() => generateToken(-1)).toThrow(InternalServerError);
  });

  it('should throw InternalServerError if safeCompare fails', () => {
    expect(() => safeCompare({} as string, 'string')).toThrow(InternalServerError);
  });
});
