import { jest } from '@jest/globals';
import type {
  InsertOrIgnoreBuilder,
  InsertOrIgnoreSource,
} from '../../../helpers/insert-or-ignore.js';

export interface InsertOrIgnoreMock {
  source: InsertOrIgnoreSource;
  builder: jest.Mocked<InsertOrIgnoreBuilder>;
  /** Appels de `insert()` : une entree par INSERT demande. */
  insert: jest.Mock<() => InsertOrIgnoreBuilder>;
}

export const createInsertOrIgnoreMock = (): InsertOrIgnoreMock => {
  const builder: jest.Mocked<InsertOrIgnoreBuilder> = {
    into: jest.fn<InsertOrIgnoreBuilder['into']>(),
    values: jest.fn<InsertOrIgnoreBuilder['values']>(),
    orIgnore: jest.fn<InsertOrIgnoreBuilder['orIgnore']>(),
    execute: jest.fn<InsertOrIgnoreBuilder['execute']>().mockResolvedValue({}),
  };
  builder.into.mockReturnValue(builder);
  builder.values.mockReturnValue(builder);
  builder.orIgnore.mockReturnValue(builder);
  const insert = jest.fn<() => InsertOrIgnoreBuilder>().mockReturnValue(builder);
  return { source: { createQueryBuilder: () => ({ insert }) }, builder, insert };
};
