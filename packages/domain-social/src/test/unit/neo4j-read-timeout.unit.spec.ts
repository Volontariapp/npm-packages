import { describe, it, expect } from '@jest/globals';
import {
  NEO4J_READ_TRANSACTION_TIMEOUT_ENV,
  NEO4J_READ_TRANSACTION_TIMEOUT_MS,
  neo4jReadTransactionTimeoutMs,
} from '../../constants.js';

const envWith = (value: string | undefined): Record<string, string | undefined> => ({
  [NEO4J_READ_TRANSACTION_TIMEOUT_ENV]: value,
});

describe('neo4jReadTransactionTimeoutMs', () => {
  it('defaults to 1800 ms without the variable', () => {
    expect(NEO4J_READ_TRANSACTION_TIMEOUT_MS).toBe(1800);
    expect(neo4jReadTransactionTimeoutMs({})).toBe(1800);
  });

  it('takes a valid value, trimmed', () => {
    expect(neo4jReadTransactionTimeoutMs(envWith('10000'))).toBe(10_000);
    expect(neo4jReadTransactionTimeoutMs(envWith(' 5000 '))).toBe(5000);
  });

  it.each(['', '   ', 'abc', '0', '-5', '1.5'])('falls back to the default for %j', (raw) => {
    expect(neo4jReadTransactionTimeoutMs(envWith(raw))).toBe(1800);
  });
});
