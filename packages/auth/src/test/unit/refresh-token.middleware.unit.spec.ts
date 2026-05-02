import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RefreshTokenMiddleware } from '../../middlewares/refresh-token.middleware.js';
import { Logger } from '@volontariapp/logger';
import { createMock } from '@golevelup/ts-jest';
import type { Request, Response, NextFunction } from 'express';

type AuthenticatedRequest = Request & { refreshToken?: string };

describe('RefreshTokenMiddleware (Unit)', () => {
  let middleware: RefreshTokenMiddleware;

  beforeEach(() => {
    jest.restoreAllMocks();
    middleware = new RefreshTokenMiddleware();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should extract token from Authorization header', () => {
    const req = createMock<Request>({
      headers: {
        authorization: 'Bearer refresh-token-123',
      },
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;

    middleware.use(req, res, next);

    expect((req as AuthenticatedRequest).refreshToken).toBe('refresh-token-123');
    expect(next).toHaveBeenCalled();
  });

  it('should extract token from cookies', () => {
    const req = createMock<Request>({
      headers: {},
      cookies: {
        refreshToken: 'cookie-refresh-token',
      },
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;

    middleware.use(req, res, next);

    expect((req as AuthenticatedRequest).refreshToken).toBe('cookie-refresh-token');
    expect(next).toHaveBeenCalled();
  });

  it('should log warning if no refresh token is found', () => {
    const req = createMock<Request>({
      headers: {},
      cookies: {},
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');

    middleware.use(req, res, next);

    // We check that the property is not a string, as createMock might return a mock function
    expect(typeof (req as AuthenticatedRequest).refreshToken).not.toBe('string');
    expect(warnSpy).toHaveBeenCalledWith('No refresh token found in headers or cookies');
  });
});
