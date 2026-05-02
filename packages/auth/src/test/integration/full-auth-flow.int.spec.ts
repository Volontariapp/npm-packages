/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, beforeEach, beforeAll, jest, afterEach } from '@jest/globals';
import fs from 'node:fs';
import { Logger } from '@volontariapp/logger';
import * as jose from 'jose';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import {
  JwtService,
  AccessTokenMiddleware,
  AccessTokenGuard,
  RolesGuard,
  GrpcInternalInterceptor,
  GrpcInternalGuard,
  GrpcMetadataHelper,
  INTERNAL_TOKEN_METADATA_KEY,
} from '../../index.js';
import { createMock } from '@golevelup/ts-jest';
import type { Metadata } from '@grpc/grpc-js';
import { AuthTestController } from '../example/auth-test.controller.js';
import { UserRoles, type JwtPayload } from '@volontariapp/shared';

interface MetadataWithUser {
  user: JwtPayload;
}

describe('Full Auth Flow (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessTokenPublic: string;
  let accessTokenPrivate: string;
  let internalPublic: string;
  let internalPrivate: string;
  let refreshTokenPrivate: string;
  let refreshTokenPublic: string;

  beforeAll(async () => {
    const accessKeys = await jose.generateKeyPair('RS256', { extractable: true });
    accessTokenPublic = await jose.exportSPKI(accessKeys.publicKey);
    accessTokenPrivate = await jose.exportPKCS8(accessKeys.privateKey);

    const internalKeys = await jose.generateKeyPair('RS256', { extractable: true });
    internalPublic = await jose.exportSPKI(internalKeys.publicKey);
    internalPrivate = await jose.exportPKCS8(internalKeys.privateKey);

    const refreshKeys = await jose.generateKeyPair('RS256', { extractable: true });
    refreshTokenPublic = await jose.exportSPKI(refreshKeys.publicKey);
    refreshTokenPrivate = await jose.exportPKCS8(refreshKeys.privateKey);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'info').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const config = {
      accessTokenPublicKeyPath: 'access-public.pem',
      accessTokenPrivateKeyPath: 'access-private.pem',
      internalPublicKeyPath: 'internal-public.pem',
      internalPrivateKeyPath: 'internal-private.pem',
      refreshTokenPublicKeyPath: 'refresh-public.pem',
      refreshTokenPrivateKeyPath: 'refresh-private.pem',
      accessTokenExpiresIn: '1h',
      internalExpiresIn: '1h',
      refreshTokenExpiresIn: '7d',
    };

    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      const p = path as string;
      if (p === 'access-public.pem') return accessTokenPublic;
      if (p === 'access-private.pem') return accessTokenPrivate;
      if (p === 'internal-public.pem') return internalPublic;
      if (p === 'internal-private.pem') return internalPrivate;
      if (p === 'refresh-public.pem') return refreshTokenPublic;
      if (p === 'refresh-private.pem') return refreshTokenPrivate;
      return '';
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthTestController],
      providers: [
        {
          provide: JwtService,
          useValue: new JwtService(config),
        },
        AccessTokenGuard,
        RolesGuard,
        GrpcInternalGuard,
        GrpcMetadataHelper,
        GrpcInternalInterceptor,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(new AccessTokenMiddleware().use);
    await app.init();

    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch {
      // Ignore error if app failed to initialize
    }
  });

  it('should complete the full auth lifecycle (HTTP AT -> Internal Token -> gRPC Verification)', async () => {
    const user: JwtPayload = { id: 'gateway-to-ms-user', role: UserRoles.VOLUNTEER };
    const accessToken = await jwtService.signAccessToken(user);

    const atGuard = app.get(AccessTokenGuard);
    const atGuardSpy = jest.spyOn(atGuard, 'canActivate');

    const interceptor = app.get(GrpcInternalInterceptor);
    const interceptorSpy = jest.spyOn(interceptor, 'intercept');

    const metadataHelper = app.get(GrpcMetadataHelper);
    const metadataHelperSpy = jest.spyOn(metadataHelper, 'createInternalMetadata');

    const msGuard = app.get(GrpcInternalGuard);
    const msGuardSpy = jest.spyOn(msGuard, 'canActivate');

    const httpResponse = await request(app.getHttpServer())
      .get('/test/external')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(httpResponse.status).toBe(200);
    expect(atGuardSpy).toHaveBeenCalled();
    expect(interceptorSpy).toHaveBeenCalled();
    expect(metadataHelperSpy).toHaveBeenCalled();

    const body = httpResponse.body as { user: { id: string }; internalToken: string };
    const internalToken = body.internalToken;
    expect(internalToken).toBeDefined();

    const incomingMetadata = createMock<Metadata>({
      get: jest.fn((key: string) => (key === INTERNAL_TOKEN_METADATA_KEY ? [internalToken] : [])),
    });

    const rpcContext = createMock<ExecutionContext>({
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => incomingMetadata,
        getData: () => ({}),
      }),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    });

    const canActivate = await msGuard.canActivate(rpcContext);

    expect(canActivate).toBe(true);
    expect(msGuardSpy).toHaveBeenCalledWith(rpcContext);

    const injectedUser = (incomingMetadata as object as MetadataWithUser & Metadata).user;
    expect(injectedUser).toBeDefined();
    expect(injectedUser.id).toBe(user.id);
  });

  it('should deny access if AT is missing', async () => {
    const response = await request(app.getHttpServer()).get('/test/external');
    expect(response.status).toBe(401);
  });

  it('should allow access if role is correct', async () => {
    const user: JwtPayload = { id: 'admin-user', role: UserRoles.ADMIN };
    const accessToken = await jwtService.signAccessToken(user);

    const response = await request(app.getHttpServer())
      .get('/test/admin')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it('should throw 403 if role is insufficient', async () => {
    const user: JwtPayload = { id: 'normal-user', role: UserRoles.VOLUNTEER };
    const accessToken = await jwtService.signAccessToken(user);

    const response = await request(app.getHttpServer())
      .get('/test/admin')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});
