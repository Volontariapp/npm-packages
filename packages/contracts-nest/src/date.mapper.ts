export interface GrpcTimestamp {
  seconds: number;
  nanos: number;
}

/**
 * Utility to map between JavaScript Date objects and gRPC Timestamp objects.
 * This prevents manual manipulations of seconds/nanos in DTOs and Transformers.
 */
export class GrpcDateMapper {
  /**
   * Converts a JavaScript Date to a gRPC-compliant Timestamp object.
   * Returns undefined if the input date is invalid.
   */
  static toTimestamp(date: Date | undefined | null): GrpcTimestamp | undefined {
    if (!date || isNaN(date.getTime())) return undefined;

    const ms = date.getTime();
    return {
      seconds: Math.floor(ms / 1000),
      nanos: (ms % 1000) * 1e6,
    };
  }

  /**
   * Converts a value to a JavaScript Date.
   * Supports: gRPC Timestamp object, ISO strings, or existing Date objects.
   */
  static toDate(value: GrpcTimestamp | Date | string | undefined | null): Date {
    if (value === null || value === undefined) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);

    // gRPC Timestamp structure
    if (typeof value === 'object' && ('seconds' in value || 'nanos' in value)) {
      const seconds = Number(value.seconds);
      const nanos = Number(value.nanos);

      // Return a fresh Date if it represents the epoch 0 (gRPC default)
      if (seconds === 0 && nanos === 0) return new Date();

      return new Date(seconds * 1000 + nanos / 1e6);
    }

    return new Date();
  }
}
