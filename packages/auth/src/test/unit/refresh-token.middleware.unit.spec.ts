import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RefreshTokenMiddleware } from '../../middlewares/refresh-token.middleware.js';
import { Logger } from '@volontariapp/logger';

describe('RefreshTokenMiddleware (Unit)', () => {
  let middleware: RefreshTokenMiddleware;

  beforeEach(() => {
    jest.restoreAllMocks();
    middleware = new RefreshTokenMiddleware();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should extract token from Authorization header', () => {
    const req = {
      headers: {
        authorization: 'Bearer refresh-token-123',
      },
    };
    const next = jest.fn();

    middleware.use(req, {}, next);

    expect(req).toHaveProperty('refreshToken', 'refresh-token-123');
    expect(next).toHaveBeenCalled();
  });

  it('should extract token from cookies', () => {
    const req = {
      headers: {},
      cookies: {
        refreshToken: 'cookie-refresh-token',
      },
    };
    const next = jest.fn();

    middleware.use(req, {}, next);

    expect(req).toHaveProperty('refreshToken', 'cookie-refresh-token');
    expect(next).toHaveBeenCalled();
  });

  it('should log warning if no refresh token is found', () => {
    const req = { headers: {} };
    const next = jest.fn();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');

    middleware.use(req, {}, next);

    expect(req).not.toHaveProperty('refreshToken');
    expect(warnSpy).toHaveBeenCalledWith('No refresh token found in headers or cookies');
  });
});
