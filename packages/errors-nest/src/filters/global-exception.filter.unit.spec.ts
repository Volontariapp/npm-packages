import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { BaseError, GrpcStatus } from '@volontariapp/errors';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter Unit Test', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: unknown;
  let mockHttpHost: unknown;
  let mockRpcHost: unknown;
  let mockRequest: unknown;
  let mockResponse: unknown;

  beforeEach(() => {
    jest.restoreAllMocks();
    filter = new GlobalExceptionFilter();

    mockRequest = {
      url: '/test-path',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHttpHost = {
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };

    mockRpcHost = {
      getContext: jest.fn().mockReturnValue({}),
      getData: jest.fn().mockReturnValue({}),
    };

    mockArgumentsHost = {
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue(mockHttpHost),
      switchToRpc: jest.fn().mockReturnValue(mockRpcHost),
    };

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  describe('HTTP Context', () => {
    beforeEach(() => {
      (mockArgumentsHost as { getType: jest.Mock }).getType.mockReturnValue('http');
    });

    it('should handle BaseError correctly', () => {
      class TestError extends BaseError {
        statusCode = HttpStatus.CONFLICT;
        grpcCode = GrpcStatus.ALREADY_EXISTS;
      }
      const exception = new TestError('Already exists', 'ALREADY_EXISTS', { id: 1 });
      const spyStatus = jest.spyOn(mockResponse as { status: jest.Mock }, 'status');
      const spyJson = jest.spyOn(mockResponse as { json: jest.Mock }, 'json');

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(spyStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(spyJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          code: 'ALREADY_EXISTS',
          message: 'Already exists',
          details: { id: 1 },
          path: '/test-path',
        }),
      );
    });

    it('should handle HttpException correctly', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      const spyStatus = jest.spyOn(mockResponse as { status: jest.Mock }, 'status');

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(spyStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('should handle generic Error and log it', () => {
      const exception = new Error('Generic error');
      const spyError = jest.spyOn(Logger.prototype, 'error');

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(spyError).toHaveBeenCalled();
    });
  });

  describe('RPC Context', () => {
    beforeEach(() => {
      (mockArgumentsHost as { getType: jest.Mock }).getType.mockReturnValue('rpc');
    });

    it('should return RpcException for BaseError', () => {
      class TestError extends BaseError {
        statusCode = HttpStatus.NOT_FOUND;
        grpcCode = GrpcStatus.NOT_FOUND;
      }
      const exception = new TestError('User not found', 'USER_NOT_FOUND');

      const result = filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(result).toBeInstanceOf(RpcException);
      const rpcError = (result as RpcException).getError() as { code: number; message: string };
      expect(rpcError.code).toBe(GrpcStatus.NOT_FOUND);
      expect(JSON.parse(rpcError.message)).toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    });

    it('should return RpcException with INTERNAL for unknown errors', () => {
      const exception = new Error('Unknown');
      const result = filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(result).toBeInstanceOf(RpcException);
      const rpcError = (result as RpcException).getError() as { code: number };
      expect(rpcError.code).toBe(GrpcStatus.INTERNAL);
    });
  });
});
