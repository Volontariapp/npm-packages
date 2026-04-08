import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrpcInternalInterceptor } from '../../interceptors/grpc-internal.interceptor.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createMock } from '@golevelup/ts-jest';
import type { JwtService } from '../../services/jwt.service.js';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('GrpcInternalInterceptor (Unit)', () => {
  let interceptor: GrpcInternalInterceptor;
  let jwtService: JwtService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = createMock<JwtService>();
    interceptor = new GrpcInternalInterceptor(jwtService);
  });

  it('should call next.handle() if user is not in request', (done) => {
    const context = createMock<ExecutionContext>();
    const httpHost = context.switchToHttp();
    jest.spyOn(httpHost, 'getRequest').mockReturnValue({});

    const next = createMock<CallHandler>();
    next.handle.mockReturnValue(of({ success: true }));

    const signSpy = jest.spyOn(jwtService, 'signInternal');

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual({ success: true });
      expect(signSpy).not.toHaveBeenCalled();
      done();
    });
  });

  it('should sign internal token if user is present', (done) => {
    const user = createAuthUser();
    const context = createMock<ExecutionContext>();
    const httpHost = context.switchToHttp();
    jest.spyOn(httpHost, 'getRequest').mockReturnValue({ user });

    const next = createMock<CallHandler>();
    next.handle.mockReturnValue(of({ success: true }));

    const signSpy = jest.spyOn(jwtService, 'signInternal').mockResolvedValue('signed-token');

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual({ success: true });
      expect(signSpy).toHaveBeenCalledWith(user);
      done();
    });
  });
});
