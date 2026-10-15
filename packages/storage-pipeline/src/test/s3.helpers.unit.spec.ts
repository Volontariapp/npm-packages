import { describe, it, expect } from '@jest/globals';
import { Readable } from 'node:stream';
import {
  partitionAll,
  streamToBuffer,
  hasTransformToByteArray,
  isAsyncIterable,
  isS3ServiceError,
} from '../s3/helpers/index.js';

describe('S3 Helpers', () => {
  describe('partitionAll', () => {
    it('should return an empty array when items are empty', async () => {
      const result = await partitionAll([], 5, (x) => x);
      expect(result).toEqual([]);
    });

    it('should process items in partitioned batches using Promise.all while preserving order', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7];

      const result = await partitionAll(items, 3, (num) => {
        return num * 10;
      });

      expect(result).toEqual([10, 20, 30, 40, 50, 60, 70]);
    });

    it('should handle batchSize smaller than 1 gracefully', async () => {
      const items = ['a', 'b'];
      const result = await partitionAll(items, 0, (x) => x.toUpperCase());
      expect(result).toEqual(['A', 'B']);
    });
  });

  describe('streamToBuffer', () => {
    it('should return an empty buffer for an empty stream', async () => {
      const emptyStream = Readable.from([]);
      const result = await streamToBuffer(emptyStream);
      expect(result.length).toBe(0);
    });

    it('should convert mixed stream chunks (Buffer, Uint8Array, string) into a unified Buffer', async () => {
      const mixedStream = Readable.from([
        Buffer.from('hello '),
        new Uint8Array([119, 111, 114, 108, 100]), // 'world'
        '!',
      ]);

      const result = await streamToBuffer(mixedStream, 2);
      expect(result.toString('utf8')).toBe('hello world!');
    });
  });

  describe('Type Guards', () => {
    describe('hasTransformToByteArray', () => {
      it('should return true when object implements transformToByteArray method', () => {
        expect(
          hasTransformToByteArray({
            transformToByteArray: () => Promise.resolve(new Uint8Array()),
          }),
        ).toBe(true);
      });

      it('should return false for invalid objects, null or primitives', () => {
        expect(hasTransformToByteArray(null)).toBe(false);
        expect(hasTransformToByteArray({})).toBe(false);
        expect(hasTransformToByteArray('not an object')).toBe(false);
        expect(hasTransformToByteArray({ transformToByteArray: 'not a function' })).toBe(false);
      });
    });

    describe('isAsyncIterable', () => {
      it('should return true for an object with Symbol.asyncIterator', () => {
        const iterable = {
          [Symbol.asyncIterator]() {
            return {
              next: () => Promise.resolve({ done: true, value: undefined }),
            };
          },
        };
        expect(isAsyncIterable(iterable)).toBe(true);
      });

      it('should return false for objects without Symbol.asyncIterator or null', () => {
        expect(isAsyncIterable(null)).toBe(false);
        expect(isAsyncIterable({})).toBe(false);
        expect(isAsyncIterable(123)).toBe(false);
      });
    });

    describe('isS3ServiceError', () => {
      it('should return true for error objects', () => {
        expect(isS3ServiceError({ name: 'NotFound' })).toBe(true);
        expect(isS3ServiceError(new Error('S3 fail'))).toBe(true);
      });

      it('should return false for non-objects or null', () => {
        expect(isS3ServiceError(null)).toBe(false);
        expect(isS3ServiceError('error string')).toBe(false);
      });
    });
  });
});
