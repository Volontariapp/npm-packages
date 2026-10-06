import type { ValueTransformer } from 'typeorm';

/**
 * `pg` returns `bigint` columns as strings. File sizes stay far below
 * `Number.MAX_SAFE_INTEGER` (the largest allowed file is 10 MB), so they are
 * exposed as numbers.
 */
export const bigintNumberTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null | undefined): number | null =>
    value === null || value === undefined ? null : Number(value),
};
