import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AccessTokenMiddleware } from '../../middlewares/access-token.middleware.js';
import { Logger } from '@volontariapp/logger';
import { createMock } from '@golevelup/ts-jest';
import type { Request, Response, NextFunction } from 'express';

type AuthenticatedRequest = Request & { accessToken?: string };

describe('AccessTokenMiddleware (Unit)', () => {
  let middleware: AccessTokenMiddleware;

  beforeEach(() => {
    jest.restoreAllMocks();
    middleware = new AccessTokenMiddleware();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should extract token from Authorization header', () => {
    const req = createMock<Request>({
      headers: {
        authorization: 'Bearer my-token',
      },
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;

    middleware.use(req, res, next);

    expect((req as AuthenticatedRequest).accessToken).toBe('my-token');
    expect(next).toHaveBeenCalled();
  });

  it('should extract token from cookies (accessToken)', () => {
    const req = createMock<Request>({
      headers: {},
      cookies: {
        accessToken: 'cookie-token',
      },
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;

    middleware.use(req, res, next);

    expect((req as AuthenticatedRequest).accessToken).toBe('cookie-token');
    expect(next).toHaveBeenCalled();
  });

  it('should extract token from cookies (access_token)', () => {
    const req = createMock<Request>({
      headers: {},
      cookies: {
        access_token: 'cookie-token-2',
      },
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;

    middleware.use(req, res, next);

    expect((req as AuthenticatedRequest).accessToken).toBe('cookie-token-2');
    expect(next).toHaveBeenCalled();
  });

  it('should log debug and call next if no token is found', () => {
    const req = createMock<Request>({
      headers: {},
      cookies: {},
    });
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;
    const debugSpy = jest.spyOn(Logger.prototype, 'debug');

    middleware.use(req, res, next);

    expect(typeof (req as AuthenticatedRequest).accessToken).not.toBe('string');
    expect(next).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith('No access token found in headers or cookies');
  });

  it('should handle missing headers or cookies gracefully', () => {
    const req = createMock<Request>();
    const res = createMock<Response>();
    const next = jest.fn() as object as NextFunction;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
