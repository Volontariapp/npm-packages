import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { ClientGrpc } from '@nestjs/microservices';
import { throwError } from 'rxjs';
import { GrpcStatus, isBaseApiError } from '@volontariapp/errors';
import {
  EntityType,
  STORAGE_ATTACHMENT_FAILED,
  STORAGE_TIMEOUT,
  StorageClientService,
  StorageUnavailableError,
  isStorageUnavailable,
} from '../index.js';

const command = {
  entityId: 'user-1',
  entityType: EntityType.ENTITY_TYPE_USER_AVATAR,
  fileIds: ['avatar-file-1'],
};

/** Erreur gRPC telle que la renvoie ms-storage : le corps JSON du GlobalExceptionFilter est dans `details`. */
const wireError = (grpcCode: number, body: Record<string, unknown>) => ({
  code: grpcCode,
  details: JSON.stringify({ timestamp: '2026-10-16T10:00:00.000Z', ...body }),
  message: `${String(grpcCode)} ERROR`,
});

describe('StorageClientService error mapping (Unit)', () => {
  let service: StorageClientService;
  let confirmFileAttachment: jest.Mock;

  const failWith = (error: unknown): void => {
    confirmFileAttachment.mockReturnValue(throwError(() => error));
  };

  beforeEach(() => {
    confirmFileAttachment = jest.fn();
    const clientGrpc: ClientGrpc = {
      getService: <T>(): T => ({ confirmFileAttachment }) as T,
      getClientByServiceName: <T>(): T => ({}) as T,
    };
    service = new StorageClientService(clientGrpc, { timeoutMs: 1000 });
    service.onModuleInit();
  });

  describe('errors raised by ms-storage (JSON body in details)', () => {
    it('relays a not found file with its status and code', async () => {
      failWith(
        wireError(GrpcStatus.NOT_FOUND, {
          statusCode: 404,
          code: 'FILE_NOT_FOUND',
          message: "File with ID 'avatar-file-1' was not found.",
          details: { fileId: 'avatar-file-1' },
        }),
      );

      const error = await service.confirmFileAttachment(command).catch((e: unknown) => e);

      expect(isBaseApiError(error)).toBe(true);
      expect(error).toMatchObject({
        statusCode: 404,
        grpcCode: GrpcStatus.NOT_FOUND,
        code: 'FILE_NOT_FOUND',
        message: "File with ID 'avatar-file-1' was not found.",
        details: { fileId: 'avatar-file-1' },
      });
    });

    it('relays a refused attachment as 422', async () => {
      failWith(
        wireError(GrpcStatus.FAILED_PRECONDITION, {
          statusCode: 422,
          code: 'FILE_ATTACHMENT_REFUSED',
          message: 'File already reserved for another entity.',
        }),
      );

      await expect(service.confirmFileAttachment(command)).rejects.toMatchObject({
        statusCode: 422,
        grpcCode: GrpcStatus.FAILED_PRECONDITION,
        code: 'FILE_ATTACHMENT_REFUSED',
      });
    });
  });

  describe('failures without a usable body keep their existing error', () => {
    it.each([
      ['a plain gRPC error', { code: 5, details: 'File not found', message: '5 NOT_FOUND' }],
      ['a body that is not JSON', { code: 13, details: '{oops', message: '13 INTERNAL' }],
      [
        'a JSON body without a status code',
        { code: 13, details: JSON.stringify({ message: 'boom' }), message: '13 INTERNAL' },
      ],
      [
        'a transport failure (UNAVAILABLE)',
        { code: 14, details: 'No connection established', message: '14 UNAVAILABLE' },
      ],
    ])('still raises STORAGE_ATTACHMENT_FAILED for %s', async (_label, error) => {
      failWith(error);

      await expect(service.confirmFileAttachment(command)).rejects.toMatchObject({
        statusCode: 500,
        code: 'STORAGE_ATTACHMENT_FAILED',
      });
    });
  });

  it('keeps the transport reason readable for the consumers that fall back', async () => {
    failWith({ code: 14, details: 'No connection established', message: '14 UNAVAILABLE' });

    const error = await service.confirmFileAttachment(command).catch((e: unknown) => e);

    expect(isStorageUnavailable(error)).toBe(true);
  });
});

describe('isStorageUnavailable', () => {
  it.each([
    ['a timeout', STORAGE_TIMEOUT('user-1', 2000)],
    [
      'an UNAVAILABLE failure',
      STORAGE_ATTACHMENT_FAILED('user-1', '14 UNAVAILABLE: no connection'),
    ],
    ['a DEADLINE_EXCEEDED failure', STORAGE_ATTACHMENT_FAILED('user-1', 'DEADLINE_EXCEEDED')],
    ['a refused connection', STORAGE_ATTACHMENT_FAILED('user-1', 'connect ECONNREFUSED 10.0.0.1')],
    ['a raw UNAVAILABLE gRPC error', { code: 14, details: 'down', message: 'down' }],
    ['a raw DEADLINE_EXCEEDED gRPC error', { code: 4, details: 'slow', message: 'slow' }],
  ])('is true for %s', (_label, error) => {
    expect(isStorageUnavailable(error)).toBe(true);
  });

  it.each([
    ['another attachment failure', STORAGE_ATTACHMENT_FAILED('user-1', 'boom')],
    ['a plain error', new Error('boom')],
    ['a gRPC NOT_FOUND error', { code: 5, details: 'File not found', message: 'File not found' }],
    ['a string', 'UNAVAILABLE'],
    ['nothing', undefined],
  ])('is false for %s', (_label, error) => {
    expect(isStorageUnavailable(error)).toBe(false);
  });
});

describe('StorageUnavailableError', () => {
  it('is a 503 UNAVAILABLE API error naming the entity', () => {
    const error = new StorageUnavailableError('user-1');

    expect(isBaseApiError(error)).toBe(true);
    expect(error).toMatchObject({
      statusCode: 503,
      grpcCode: GrpcStatus.UNAVAILABLE,
      code: 'STORAGE_UNAVAILABLE',
    });
    expect(error.message).toContain('user-1');
  });
});
