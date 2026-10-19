import type { ValueTransformer } from 'typeorm';

/** numeric columns come back from the driver as strings. */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null): number | null => (value === null ? null : Number(value)),
};
