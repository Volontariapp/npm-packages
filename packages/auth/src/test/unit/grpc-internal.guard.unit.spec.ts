import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrpcInternalGuard } from '../../guards/grpc-internal.guard.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createExecutionContext } from '../helpers/context.helper.js';
import { createMock } from '@golevelup/ts-jest';
import type { JwtService } from '../../services/jwt.service.js';
import { INTERNAL_TOKEN_METADATA_KEY } from '../../constants/index.js';
import { UnauthorizedError } from '@volontariapp/errors';

describe('GrpcInternalGuard (Unit)', () => {
  let guard: GrpcInternalGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = createMock<JwtService>();
    guard = new GrpcInternalGuard(jwtService);
    jest.spyOn(guard['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(guard['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(guard['logger'], 'error').mockImplementation(() => undefined);
  });

  it('should throw UnauthorizedError if metadata is missing internal token', async () => {
    const context = createExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError if internal token is not a string', async () => {
    const context = createExecutionContext({
      [INTERNAL_TOKEN_METADATA_KEY]: [Buffer.from('token-as-buffer') as unknown as string],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError if token is invalid', async () => {
    const context = createExecutionContext({
      [INTERNAL_TOKEN_METADATA_KEY]: ['invalid-token'],
    });

    const verifySpy = jest
      .spyOn(jwtService, 'verifyInternal')
      .mockRejectedValue(new Error('Invalid'));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
    expect(verifySpy).toHaveBeenCalledWith('invalid-token');
  });

  it('should throw UnauthorizedError if verifyInternal rejects with non-Error', async () => {
    const context = createExecutionContext({
      [INTERNAL_TOKEN_METADATA_KEY]: ['token'],
    });

    jest.spyOn(jwtService, 'verifyInternal').mockRejectedValue('Some string error');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
  });

  it('should set user in context and return true for valid token', async () => {
    const user = createAuthUser();
    const context = createExecutionContext({
      [INTERNAL_TOKEN_METADATA_KEY]: ['valid-token'],
    });

    const verifySpy = jest.spyOn(jwtService, 'verifyInternal').mockResolvedValue(user);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const rpcContext = context.switchToRpc().getContext<Record<string, unknown>>();
    expect(rpcContext.user).toEqual(user);
    expect(verifySpy).toHaveBeenCalledWith('valid-token');
  });
});
