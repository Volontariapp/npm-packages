import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GrpcStatus, NotFoundError, ConflictError } from '@volontariapp/errors';
import type { Observable } from 'rxjs';
import { GlobalExceptionFilter } from '../global-exception.filter.js';
import {
  createHttpHost,
  createMockResponse,
  createRpcHost,
} from './helpers/argument-host.factory.js';
import type {
  GrpcErrorPayload,
  JsonBody,
  MockHttpResponse,
  ParsedGrpcBody,
} from './interfaces/filter.test.interfaces.js';

describe('GlobalExceptionFilter Unit Test', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.restoreAllMocks();
  });

  describe('HTTP Context', () => {
    let response: MockHttpResponse;

    beforeEach(() => {
      response = createMockResponse();
    });

    it('should respond 404 with BaseError when resource is not found', () => {
      const host = createHttpHost(response, { url: '/api/v1/events' });
      const exception = new NotFoundError('Tag not found', 'TAG_NOT_FOUND', { tagId: 'abc' });

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<JsonBody>>({
          statusCode: 404,
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found',
          details: { tagId: 'abc' },
          path: '/api/v1/events',
        }),
      );
    });

    it('should respond 409 with BaseError when resource conflicts', () => {
      const host = createHttpHost(response, { url: '/api/v1/events' });
      const exception = new ConflictError('Event already exists', 'EVENT_CONFLICT');

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(409);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<JsonBody>>({
          statusCode: 409,
          code: 'EVENT_CONFLICT',
          message: 'Event already exists',
        }),
      );
    });

    it('should respond 403 with HttpException for access denied', () => {
      const host = createHttpHost(response, { url: '/api/v1/events' });
      const exception = new HttpException('Forbidden access', HttpStatus.FORBIDDEN);

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<JsonBody>>({
          statusCode: 403,
          message: 'Forbidden access',
        }),
      );
    });

    it('should decode a gRPC-relayed JSON error blob and respond with the correct HTTP status', () => {
      const host = createHttpHost(response, { url: '/api/v1/events' });
      const innerPayload = JSON.stringify({
        statusCode: 404,
        code: 'TAG_NOT_FOUND',
        message: 'Tag with id 76c5b964 not found',
        timestamp: new Date().toISOString(),
      });
      const exception = new Error(`5 NOT_FOUND: ${innerPayload}`);

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<JsonBody>>({
          statusCode: 404,
          code: 'TAG_NOT_FOUND',
          message: 'Tag with id 76c5b964 not found',
        }),
      );
    });

    it('should respond 500 for an unhandled generic Error without a JSON payload', () => {
      const host = createHttpHost(response, { url: '/api/v1/events' });
      const exception = new Error('Database connection lost');

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<JsonBody>>({
          statusCode: 500,
          code: 'INTERNAL_ERROR',
          message: 'Database connection lost',
        }),
      );
    });
  });

  describe('RPC Context', () => {
    it('should emit NOT_FOUND gRPC code and a 404 JSON payload for NotFoundError', (done) => {
      const host = createRpcHost();
      const exception = new NotFoundError('Event not found', 'EVENT_NOT_FOUND');

      const result = filter.catch(exception, host) as Observable<never>;

      result.subscribe({
        error: (err: unknown) => {
          const payload = err as GrpcErrorPayload;
          expect(payload.code).toBe(GrpcStatus.NOT_FOUND);
          const body = JSON.parse(payload.message) as ParsedGrpcBody;
          expect(body.statusCode).toBe(404);
          expect(body.code).toBe('EVENT_NOT_FOUND');
          expect(body.message).toBe('Event not found');
          done();
        },
      });
    });

    it('should emit ALREADY_EXISTS gRPC code and a 409 JSON payload for ConflictError', (done) => {
      const host = createRpcHost();
      const exception = new ConflictError('User already exists', 'USER_CONFLICT');

      const result = filter.catch(exception, host) as Observable<never>;

      result.subscribe({
        error: (err: unknown) => {
          const payload = err as GrpcErrorPayload;
          expect(payload.code).toBe(GrpcStatus.ALREADY_EXISTS);
          const body = JSON.parse(payload.message) as ParsedGrpcBody;
          expect(body.statusCode).toBe(409);
          expect(body.code).toBe('USER_CONFLICT');
          done();
        },
      });
    });

    it('should emit INTERNAL gRPC code and a 500 JSON payload for unknown errors', (done) => {
      const host = createRpcHost();
      const exception = new Error('Unexpected DB failure');

      const result = filter.catch(exception, host) as Observable<never>;

      result.subscribe({
        error: (err: unknown) => {
          const payload = err as GrpcErrorPayload;
          expect(payload.code).toBe(GrpcStatus.INTERNAL);
          const body = JSON.parse(payload.message) as ParsedGrpcBody;
          expect(body.statusCode).toBe(500);
          expect(body.message).toBe('Unexpected DB failure');
          done();
        },
      });
    });
  });
});
