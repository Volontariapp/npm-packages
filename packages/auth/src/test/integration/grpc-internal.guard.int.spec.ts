import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import fs from 'node:fs';
import * as jose from 'jose';
import { Test } from '@nestjs/testing';
import { GrpcInternalGuard } from '../../guards/grpc-internal.guard.js';
import { JwtService } from '../../services/jwt.service.js';
import { AUTH_OPTIONS } from '../../constants/index.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createExecutionContext } from '../helpers/context.helper.js';
import { UnauthorizedError } from '@volontariapp/errors';
import { INTERNAL_TOKEN_METADATA_KEY } from '../../constants/index.js';
import type { AuthConfig } from '../../interfaces/auth-config.interface.js';

describe('GrpcInternalGuard (Integration)', () => {
  let guard: GrpcInternalGuard;
  let jwtService: JwtService;
  let internalPrivate: string;
  let internalPublic: string;
  let gatewayPublic: string;

  const config: AuthConfig = {
    internalPrivateKeyPath: 'internal-private-path',
    internalPublicKeyPath: 'internal-public-path',
    gatewayPublicKeyPath: 'gateway-public-path',
    internalExpiresIn: '1h',
    gatewayExpiresIn: '1h',
  };

  beforeAll(async () => {
    const internalKeys = await jose.generateKeyPair('RS256', { extractable: true });
    internalPrivate = await jose.exportPKCS8(internalKeys.privateKey);
    internalPublic = await jose.exportSPKI(internalKeys.publicKey);

    const gatewayKeys = await jose.generateKeyPair('RS256', { extractable: true });
    gatewayPublic = await jose.exportSPKI(gatewayKeys.publicKey);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path === 'internal-private-path') return internalPrivate;
      if (path === 'internal-public-path') return internalPublic;
      if (path === 'gateway-public-path') return gatewayPublic;
      throw new Error('File not found');
    });

    const module = await Test.createTestingModule({
      providers: [
        GrpcInternalGuard,
        {
          provide: JwtService,
          useFactory: (opts: AuthConfig) => new JwtService(opts),
          inject: [AUTH_OPTIONS],
        },
        {
          provide: AUTH_OPTIONS,
          useValue: config,
        },
      ],
    }).compile();

    guard = module.get<GrpcInternalGuard>(GrpcInternalGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should allow access with a valid internal token', async () => {
    const user = createAuthUser();
    const token = await jwtService.signInternal(user);
    const context = createExecutionContext({
      [INTERNAL_TOKEN_METADATA_KEY]: [token],
    });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    const rpcContext = context.switchToRpc().getContext<Record<string, unknown>>();
    expect(rpcContext.user).toEqual(
      expect.objectContaining({
        id: user.id,
        role: user.role,
      }),
    );
  });

  it('should deny access with an invalid token', async () => {
    const context = createExecutionContext({
      [INTERNAL_TOKEN_METADATA_KEY]: ['invalid-token'],
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
  });
});
