/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, beforeEach, beforeAll, jest, afterEach } from '@jest/globals';
import fs from 'node:fs';
import { Logger } from '@volontariapp/logger';
import * as jose from 'jose';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { APP_GUARD } from '@nestjs/core';
import {
  JwtService,
  AccessTokenMiddleware,
  RefreshTokenMiddleware,
  AccessTokenGuard,
} from '../../index.js';
import {
  PublicTestController,
  PublicClassTestController,
} from '../example/public-test.controller.js';

describe('Public Bypass (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessTokenPublic: string;
  let accessTokenPrivate: string;
  let refreshTokenPublic: string;
  let refreshTokenPrivate: string;

  beforeAll(async () => {
    const accessKeys = await jose.generateKeyPair('RS256', { extractable: true });
    accessTokenPublic = await jose.exportSPKI(accessKeys.publicKey);
    accessTokenPrivate = await jose.exportPKCS8(accessKeys.privateKey);

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
      if (path === 'access-public.pem') return accessTokenPublic;
      if (path === 'access-private.pem') return accessTokenPrivate;
      if (path === 'refresh-public.pem') return refreshTokenPublic;
      if (path === 'refresh-private.pem') return refreshTokenPrivate;
      return '';
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PublicTestController, PublicClassTestController],
      providers: [
        {
          provide: JwtService,
          useValue: new JwtService(config),
        },
        AccessTokenGuard,
        {
          provide: APP_GUARD,
          useClass: AccessTokenGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(new AccessTokenMiddleware().use);
    app.use(new RefreshTokenMiddleware().use);
    await app.init();

    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch {
      // Ignore
    }
  });

  it('should allow access to @Public() route without token', async () => {
    const response = await request(app.getHttpServer()).get('/public-test/open');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'open' });
  });

  it('should deny access to non-public route without token', async () => {
    const response = await request(app.getHttpServer()).get('/public-test/closed');
    expect(response.status).toBe(401);
  });

  it('should allow access to non-public route with valid token', async () => {
    const user = { id: 'test-user', role: 'user' };
    const token = await jwtService.signAccessToken(user);

    const response = await request(app.getHttpServer())
      .get('/public-test/closed')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'closed' });
  });

  it('should allow access to @Public() route even if AccessTokenGuard is also explicitly applied', async () => {
    const response = await request(app.getHttpServer()).get('/public-test/mixed');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'mixed' });
  });

  it('should deny access to non-public route with invalid token', async () => {
    const response = await request(app.getHttpServer())
      .get('/public-test/closed')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  it('should allow access to all routes in @Public() class', async () => {
    const responseOne = await request(app.getHttpServer()).get('/public-class-test/one');
    expect(responseOne.status).toBe(200);
    expect(responseOne.body).toEqual({ status: 'one' });

    const responseTwo = await request(app.getHttpServer()).get('/public-class-test/two');
    expect(responseTwo.status).toBe(200);
    expect(responseTwo.body).toEqual({ status: 'two' });
  });

  it('should allow access to refresh token route with RT even if global AT guard is present', async () => {
    const user = { id: 'test-user', role: 'user' };
    const refreshToken = await jwtService.signRefreshToken(user);

    const response = await request(app.getHttpServer())
      .get('/public-test/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'refreshed' });
  });
});
