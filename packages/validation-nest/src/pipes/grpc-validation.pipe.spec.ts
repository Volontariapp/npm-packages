import type { ArgumentMetadata } from '@nestjs/common';
import { GrpcValidationPipe } from './grpc-validation.pipe.js';

describe('GrpcValidationPipe', () => {
  let pipe: GrpcValidationPipe;

  enum MockEnum {
    UNSPECIFIED = 0,
    ACTIVE = 1,
  }

  interface TimestampResult {
    timestamp: {
      seconds: number;
      nanos: number;
    };
  }

  interface StatusResult {
    status: MockEnum;
  }

  interface NestedResult {
    items: { name: string | undefined }[];
    meta: { count: string; type: string | undefined };
  }

  beforeEach(() => {
    pipe = new GrpcValidationPipe({
      enumMaps: {
        status: MockEnum as unknown as Record<string | number, string | number>,
      },
    });
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should remove empty strings and replace with undefined', async () => {
    const value = { name: '', age: 25 };
    const metadata: ArgumentMetadata = { type: 'body', metatype: Object };

    const result = await pipe.transform(value, metadata);
    expect(result).toEqual({ name: undefined, age: 25 });
  });

  it('should convert stringified seconds and nanos to numbers', async () => {
    const value = { timestamp: { seconds: '1781514000', nanos: '0' } };
    const metadata: ArgumentMetadata = { type: 'body', metatype: Object };

    const result = (await pipe.transform(value, metadata)) as TimestampResult;
    expect(result.timestamp.seconds).toBe(1781514000);
    expect(result.timestamp.nanos).toBe(0);
  });

  it('should map string enum names to numeric values based on enumMaps', async () => {
    const value = { status: 'ACTIVE' };
    const metadata: ArgumentMetadata = { type: 'body', metatype: Object };

    const result = (await pipe.transform(value, metadata)) as StatusResult;
    expect(result.status).toBe(MockEnum.ACTIVE);
  });

  it('should handle nested objects and arrays', async () => {
    const value = {
      items: [{ name: '' }, { name: 'test' }],
      meta: { count: '10', type: '' },
    };
    const metadata: ArgumentMetadata = { type: 'body', metatype: Object };

    const result = (await pipe.transform(value, metadata)) as NestedResult;
    expect(result.items[0]?.name).toBeUndefined();
    expect(result.meta.type).toBeUndefined();
  });
});
