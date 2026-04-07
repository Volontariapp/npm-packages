import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Reflector } from '@nestjs/core';
import { ForbiddenError } from '@volontariapp/errors';
import { RolesGuard } from '../../guards/roles.guard.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createMock } from '@golevelup/ts-jest';
import type { ExecutionContext } from '@nestjs/common';

describe('RolesGuard (Unit)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = createMock<Reflector>();
    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMock<ExecutionContext>();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    const user = createAuthUser({ role: 'admin' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    });

    expect(guard.canActivate(context as unknown as ExecutionContext)).toBe(true);
  });

  it('should throw 403 if user has insufficient role', () => {
    const user = createAuthUser({ role: 'user' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    });

    expect(() => guard.canActivate(context as unknown as ExecutionContext)).toThrow(ForbiddenError);
  });

  it('should throw 403 if user is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
    });

    expect(() => guard.canActivate(context as unknown as ExecutionContext)).toThrow(ForbiddenError);
  });
});
