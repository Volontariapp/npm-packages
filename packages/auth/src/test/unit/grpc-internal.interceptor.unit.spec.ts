import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrpcInternalInterceptor } from '../../interceptors/grpc-internal.interceptor.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createMock } from '@golevelup/ts-jest';
import type { JwtService } from '../../services/jwt.service.js';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

describe('GrpcInternalInterceptor (Unit)', () => {
  let interceptor: GrpcInternalInterceptor;
  let jwtService: JwtService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = createMock<JwtService>();
    interceptor = new GrpcInternalInterceptor(jwtService);
    jest.spyOn(interceptor['logger'], 'debug').mockImplementation(() => undefined);
  });

  it('should call next.handle() if user is not in request', async () => {
    const context = createMock<ExecutionContext>();
    const httpHost = context.switchToHttp();
    jest.spyOn(httpHost, 'getRequest').mockReturnValue({});

    const next = createMock<CallHandler>();
    next.handle.mockReturnValue(of({ success: true }));

    const signSpy = jest.spyOn(jwtService, 'signInternal');

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ success: true });
    expect(signSpy).not.toHaveBeenCalled();
  });

  it('should sign internal token if user is present', async () => {
    const user = createAuthUser();
    const context = createMock<ExecutionContext>();
    const httpRequest = { user };
    const httpHost = context.switchToHttp();
    jest.spyOn(httpHost, 'getRequest').mockReturnValue(httpRequest);

    const next = createMock<CallHandler>();
    next.handle.mockReturnValue(of({ success: true }));

    const signSpy = jest.spyOn(jwtService, 'signInternal').mockResolvedValue('signed-token');

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual({ success: true });
    expect(signSpy).toHaveBeenCalledWith(user);
    expect(httpRequest).toHaveProperty('internalToken', 'signed-token');
  });
});
