import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AccessTokenMiddleware } from '../../middlewares/access-token.middleware.js';
import { Logger } from '@volontariapp/logger';

describe('AccessTokenMiddleware (Unit)', () => {
  let middleware: AccessTokenMiddleware;

  beforeEach(() => {
    jest.restoreAllMocks();
    middleware = new AccessTokenMiddleware();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should extract token from Authorization header', () => {
    const req = {
      headers: {
        authorization: 'Bearer my-token',
      },
    };
    const next = jest.fn();

    middleware.use(req, {}, next);

    expect(req).toHaveProperty('accessToken', 'my-token');
    expect(next).toHaveBeenCalled();
  });

  it('should extract token from cookies (accessToken)', () => {
    const req = {
      headers: {},
      cookies: {
        accessToken: 'cookie-token',
      },
    };
    const next = jest.fn();

    middleware.use(req, {}, next);

    expect(req).toHaveProperty('accessToken', 'cookie-token');
    expect(next).toHaveBeenCalled();
  });

  it('should extract token from cookies (access_token)', () => {
    const req = {
      headers: {},
      cookies: {
        access_token: 'cookie-token-2',
      },
    };
    const next = jest.fn();

    middleware.use(req, {}, next);

    expect(req).toHaveProperty('accessToken', 'cookie-token-2');
    expect(next).toHaveBeenCalled();
  });

  it('should log debug and call next if no token is found', () => {
    const req = {
      headers: {},
    };
    const next = jest.fn();
    const debugSpy = jest.spyOn(Logger.prototype, 'debug');

    middleware.use(req, {}, next);

    expect(req).not.toHaveProperty('accessToken');
    expect(next).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith('No access token found in headers or cookies');
  });

  it('should handle missing headers or cookies gracefully', () => {
    const req = {};
    const next = jest.fn();

    middleware.use(req, {}, next);

    expect(next).toHaveBeenCalled();
  });
});
