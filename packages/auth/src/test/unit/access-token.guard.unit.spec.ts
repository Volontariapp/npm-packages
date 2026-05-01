import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AccessTokenGuard } from '../../guards/access-token.guard.js';
import { createMock } from '@golevelup/ts-jest';
import type { JwtService } from '../../services/jwt.service.js';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Logger } from '@volontariapp/logger';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { IS_REFRESH_TOKEN_KEY } from '../../index.js';

describe('AccessTokenGuard (Unit)', () => {
  let guard: AccessTokenGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = createMock<JwtService>();
    reflector = createMock<Reflector>();
    guard = new AccessTokenGuard(jwtService, reflector);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
  });

  it('should allow access and set user if token is valid', async () => {
    const user = createAuthUser();
    const token = 'valid-token';
    const request = { accessToken: token };
    const context = createMock<ExecutionContext>();
    const spyVerifyAccessToken = jest.spyOn(jwtService, 'verifyAccessToken');
    jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue(request);

    spyVerifyAccessToken.mockResolvedValue(user);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request).toHaveProperty('user', user);
    expect(spyVerifyAccessToken).toHaveBeenCalledWith(token);
  });

  it('should throw MISSING_ACCESS_TOKEN if token is missing', async () => {
    const request = {};
    const context = createMock<ExecutionContext>();
    jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue(request);

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('should throw INVALID_ACCESS_TOKEN if token verification fails', async () => {
    const token = 'invalid-token';
    const request = { accessToken: token };
    const context = createMock<ExecutionContext>();
    jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue(request);

    jest.spyOn(jwtService, 'verifyAccessToken').mockRejectedValue(new Error('Invalid signature'));

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('should allow access if route is public', async () => {
    const context = createMock<ExecutionContext>();
    const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(getAllAndOverrideSpy).toHaveBeenCalled();
  });

  it('should allow access if route is refresh token route', async () => {
    const context = createMock<ExecutionContext>();
    const getAllAndOverrideSpy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => {
        if (key === IS_REFRESH_TOKEN_KEY) return true;
        return false;
      });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_REFRESH_TOKEN_KEY, expect.anything());
  });
});
