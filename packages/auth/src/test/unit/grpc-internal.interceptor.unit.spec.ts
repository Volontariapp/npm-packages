import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrpcInternalInterceptor } from '../../interceptors/grpc-internal.interceptor.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createMock } from '@golevelup/ts-jest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import type { GrpcMetadataHelper } from '../../services/grpc-metadata.helper.js';
import { Metadata } from '@grpc/grpc-js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../../constants/index.js';

describe('GrpcInternalInterceptor (Unit)', () => {
  let interceptor: GrpcInternalInterceptor;
  let metadataHelper: GrpcMetadataHelper;

  beforeEach(() => {
    jest.restoreAllMocks();
    metadataHelper = createMock<GrpcMetadataHelper>();
    interceptor = new GrpcInternalInterceptor(metadataHelper);
    jest.spyOn(interceptor['logger'], 'debug').mockImplementation(() => undefined);
  });

  it('should call next.handle() if user is not in request', async () => {
    const context = createMock<ExecutionContext>();
    const httpHost = context.switchToHttp();
    jest.spyOn(httpHost, 'getRequest').mockReturnValue({});

    const next = createMock<CallHandler>();
    next.handle.mockReturnValue(of({ success: true }));

    const createSpy = jest.spyOn(metadataHelper, 'createInternalMetadata');

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ success: true });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should sign internal token if user is present', async () => {
    const user = createAuthUser();
    const context = createMock<ExecutionContext>();
    const httpRequest = { user };
    const httpHost = context.switchToHttp();
    jest.spyOn(httpHost, 'getRequest').mockReturnValue(httpRequest);

    const next = createMock<CallHandler>();
    next.handle.mockReturnValue(of({ success: true }));

    const mockMetadata = new Metadata();
    mockMetadata.set(INTERNAL_TOKEN_METADATA_KEY, 'signed-token');

    const createSpy = jest
      .spyOn(metadataHelper, 'createInternalMetadata')
      .mockResolvedValue(mockMetadata);

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ success: true });
    expect(createSpy).toHaveBeenCalledWith(user);
    expect(httpRequest).toHaveProperty('internalToken', 'signed-token');
    expect(httpRequest).toHaveProperty('internalMetadata', mockMetadata);
  });
});
