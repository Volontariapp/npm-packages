import { describe, expect, it } from '@jest/globals';
import { bigintNumberTransformer } from '../index.js';

describe('bigintNumberTransformer', () => {
  it('converts the string returned by pg into a number', () => {
    expect(bigintNumberTransformer.from('10485760')).toBe(10485760);
  });

  it('keeps null as null when reading', () => {
    expect(bigintNumberTransformer.from(null)).toBeNull();
  });

  it('treats an undefined database value as null', () => {
    expect(bigintNumberTransformer.from(undefined)).toBeNull();
  });

  it('writes numbers and null unchanged', () => {
    expect(bigintNumberTransformer.to(1024)).toBe(1024);
    expect(bigintNumberTransformer.to(null)).toBeNull();
  });
});
