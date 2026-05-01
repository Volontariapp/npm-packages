import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RefreshTokenGuard } from '../../guards/refresh-token.guard.js';
import { createMock } from '@golevelup/ts-jest';
import type { JwtService } from '../../services/jwt.service.js';
import type { ExecutionContext } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { createAuthUser } from '../factories/auth-user.factory.js';

describe('RefreshTokenGuard (Unit)', () => {
  let guard: RefreshTokenGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = createMock<JwtService>();
    guard = new RefreshTokenGuard(jwtService);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should allow access if refresh token is valid', async () => {
    const user = createAuthUser();
    const token = 'valid-refresh';
    const request = { refreshToken: token };
    const context = createMock<ExecutionContext>();
    jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue(request);

    jest.spyOn(jwtService, 'verifyRefreshToken').mockResolvedValue(user);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request).toHaveProperty('user', user);
  });

  it('should throw MISSING_REFRESH_TOKEN if token is missing', async () => {
    const request = {};
    const context = createMock<ExecutionContext>();
    jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue(request);

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('should throw INVALID_REFRESH_TOKEN if token verification fails', async () => {
    const token = 'invalid-refresh';
    const request = { refreshToken: token };
    const context = createMock<ExecutionContext>();
    jest.spyOn(context.switchToHttp(), 'getRequest').mockReturnValue(request);

    jest.spyOn(jwtService, 'verifyRefreshToken').mockRejectedValue(new Error('Expired'));

    await expect(guard.canActivate(context)).rejects.toThrow();
  });
});
