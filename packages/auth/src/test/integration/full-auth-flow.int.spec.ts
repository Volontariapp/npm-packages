/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, beforeAll, jest, afterEach } from '@jest/globals';
import fs from 'node:fs';
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
  INTERNAL_TOKEN_METADATA_KEY,
} from '../../index.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import { createMock } from '@golevelup/ts-jest';
import type { Metadata } from '@grpc/grpc-js';
import { AuthTestController } from '../example/auth-test.controller.js';

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
      if (path === 'access-public.pem') return accessTokenPublic;
      if (path === 'access-private.pem') return accessTokenPrivate;
      if (path === 'internal-public.pem') return internalPublic;
      if (path === 'internal-private.pem') return internalPrivate;
      if (path === 'refresh-public.pem') return refreshTokenPublic;
      if (path === 'refresh-private.pem') return refreshTokenPrivate;
      throw new Error(`Unexpected path: ${path as string}`);
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
        GrpcInternalInterceptor,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(new AccessTokenMiddleware().use);
    await app.init();

    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should complete the full auth lifecycle (HTTP AT -> Internal Token -> gRPC Verification)', async () => {
    const user = createAuthUser();
    const accessToken = await jwtService.signAccessToken(user);

    const httpResponse = await request(app.getHttpServer())
      .get('/test/external')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(httpResponse.status).toBe(200);
    const body = httpResponse.body as { user: { id: string }; internalToken: string };
    expect(body.user.id).toBe(user.id);
    const internalToken = body.internalToken;
    expect(typeof internalToken).toBe('string');

    const metadataMock = createMock<Metadata>({
      get: jest.fn((key: string) => (key === INTERNAL_TOKEN_METADATA_KEY ? [internalToken] : [])),
    });

    const executionContext = createMock<ExecutionContext>({
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => metadataMock,
        getData: () => ({}),
      }),
    });

    const guard = app.get(GrpcInternalGuard);
    const canActivate = await guard.canActivate(executionContext as unknown as ExecutionContext);
    expect(canActivate).toBe(true);
  });

  it('should deny access if AT is missing', async () => {
    const response = await request(app.getHttpServer()).get('/test/external');
    expect(response.status).toBe(401);
  });

  it('should allow access if role is correct', async () => {
    const user = createAuthUser({ role: 'admin' });
    const accessToken = await jwtService.signAccessToken(user);

    const response = await request(app.getHttpServer())
      .get('/test/admin')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it('should throw 403 if role is insufficient', async () => {
    const user = createAuthUser({ role: 'user' });
    const accessToken = await jwtService.signAccessToken(user);

    const response = await request(app.getHttpServer())
      .get('/test/admin')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});
