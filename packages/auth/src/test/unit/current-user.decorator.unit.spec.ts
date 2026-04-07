import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import type { ExecutionContext } from '@nestjs/common';
import { createAuthUser } from '../factories/auth-user.factory.js';

jest.unstable_mockModule('@nestjs/common', () => ({
  createParamDecorator: jest.fn((factory) => factory),
}));

await import('@nestjs/common');
const { CurrentUser } = await import('../../decorators/current-user.decorator.js');

describe('CurrentUser Decorator (Unit)', () => {
  const decoratorFactory = CurrentUser as unknown as (
    data: unknown,
    ctx: ExecutionContext,
  ) => unknown;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should extract user from rpc context', () => {
    const user = createAuthUser();
    const context = createMock<ExecutionContext>();
    context.getType.mockReturnValue('rpc');
    const rpcHost = context.switchToRpc();
    rpcHost.getContext.mockReturnValue({ user });

    const result = decoratorFactory(undefined, context);
    expect(result).toEqual(user);
  });

  it('should extract user from http request', () => {
    const user = createAuthUser();
    const context = createMock<ExecutionContext>();
    context.getType.mockReturnValue('http');
    const httpHost = context.switchToHttp();
    httpHost.getRequest.mockReturnValue({ user });

    const result = decoratorFactory(undefined, context);
    expect(result).toEqual(user);
  });

  it('should return undefined if user is missing in http', () => {
    const context = createMock<ExecutionContext>();
    context.getType.mockReturnValue('http');
    const httpHost = context.switchToHttp();
    httpHost.getRequest.mockReturnValue({});

    const result = decoratorFactory(undefined, context);
    expect(result).toBeUndefined();
  });
});
