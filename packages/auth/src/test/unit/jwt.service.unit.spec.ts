import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import fs from 'node:fs';
import * as jose from 'jose';
import { JwtService } from '../../services/jwt.service.js';
import { createAuthUser } from '../factories/auth-user.factory.js';
import type { AuthConfig } from '../../interfaces/index.js';

describe('JwtService (Unit)', () => {
  let jwtService: JwtService;
  let internalPrivate: string;
  let internalPublic: string;
  let accessTokenPrivate: string;
  let accessTokenPublic: string;
  let refreshTokenPrivate: string;
  let refreshTokenPublic: string;

  const config: AuthConfig = {
    internalPrivateKeyPath: 'internal-private-path',
    internalPublicKeyPath: 'internal-public-path',
    accessTokenPrivateKeyPath: 'access-private-path',
    accessTokenPublicKeyPath: 'access-public-path',
    refreshTokenPrivateKeyPath: 'refresh-private-path',
    refreshTokenPublicKeyPath: 'refresh-public-path',
    internalExpiresIn: '1h',
    accessTokenExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
  };

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

  beforeEach(() => {
    jest.restoreAllMocks();
    jwtService = new JwtService(config);
    jest.spyOn(jwtService['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(jwtService['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(jwtService['logger'], 'warn').mockImplementation(() => undefined);

    const readSpy = jest.spyOn(fs, 'readFileSync');
    readSpy.mockImplementation((path) => {
      if (path === 'internal-private-path') return internalPrivate;
      if (path === 'internal-public-path') return internalPublic;
      if (path === 'access-private-path') return accessTokenPrivate;
      if (path === 'access-public-path') return accessTokenPublic;
      if (path === 'refresh-private-path') return refreshTokenPrivate;
      if (path === 'refresh-public-path') return refreshTokenPublic;
      throw new Error(`Unexpected path: ${path as string}`);
    });
  });

  describe('signInternal', () => {
    it('should sign a token with the internal private key', async () => {
      const user = createAuthUser();
      const token = await jwtService.signInternal(user);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyInternal', () => {
    it('should verify a valid internal token', async () => {
      const user = createAuthUser();
      const token = await jwtService.signInternal(user);

      const payload = await jwtService.verifyInternal(token);

      expect(payload.id).toBe(user.id);
      expect(payload.role).toBe(user.role);
    });

    it('should throw when token is invalid', async () => {
      await expect(jwtService.verifyInternal('invalid-token')).rejects.toThrow();
    });
  });

  describe('Delayed Configuration Errors', () => {
    it('should not throw on construction if expiration is missing', () => {
      expect(
        () => new JwtService({ ...config, internalExpiresIn: undefined as unknown as string }),
      ).not.toThrow();
    });

    it('should throw when signing if internal expiration is missing', async () => {
      const svc = new JwtService({ ...config, internalExpiresIn: undefined as unknown as string });
      await expect(svc.signInternal(createAuthUser())).rejects.toThrow(
        'Internal expiration time not configured',
      );
    });

    it('should throw when signing if access token expiration is missing', async () => {
      const svc = new JwtService({
        ...config,
        accessTokenExpiresIn: undefined as unknown as string,
      });
      await expect(svc.signAccessToken(createAuthUser())).rejects.toThrow(
        'Access expiration time not configured',
      );
    });

    it('should throw when signing if refresh token expiration is missing', async () => {
      const svc = new JwtService({
        ...config,
        refreshTokenExpiresIn: undefined as unknown as string,
      });
      await expect(svc.signRefreshToken(createAuthUser())).rejects.toThrow(
        'Refresh expiration time not configured',
      );
    });
  });

  describe('Key Loading Errors', () => {
    it('should throw if internal private key path is missing when signing', async () => {
      const svc = new JwtService({
        ...config,
        internalPrivateKeyPath: undefined as unknown as string,
      });
      await expect(svc.signInternal(createAuthUser())).rejects.toThrow(
        'Internal private key path not configured',
      );
    });

    it('should throw if internal public key path is missing when verifying', async () => {
      const svc = new JwtService({
        ...config,
        internalPublicKeyPath: undefined as unknown as string,
      });
      await expect(svc.verifyInternal('token')).rejects.toThrow(
        'Internal public key path not configured',
      );
    });

    it('should throw if access public key path is missing when verifying', async () => {
      const svc = new JwtService({
        ...config,
        accessTokenPublicKeyPath: undefined as unknown as string,
      });
      await expect(svc.verifyAccessToken('token')).rejects.toThrow(
        'Access public key path not configured',
      );
    });

    it('should throw if refresh public key path is missing when verifying', async () => {
      const svc = new JwtService({
        ...config,
        refreshTokenPublicKeyPath: undefined as unknown as string,
      });
      await expect(svc.verifyRefreshToken('token')).rejects.toThrow(
        'Refresh public key path not configured',
      );
    });

    it('should throw if file reading fails or key is invalid', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Read error');
      });
      await expect(jwtService.signInternal(createAuthUser())).rejects.toThrow(
        'Failed to import internal private key',
      );
      await expect(jwtService.verifyInternal('token')).rejects.toThrow(
        'Failed to import internal public key',
      );
      await expect(jwtService.verifyAccessToken('token')).rejects.toThrow(
        'Failed to import access public key',
      );
      await expect(jwtService.verifyRefreshToken('token')).rejects.toThrow(
        'Failed to import refresh public key',
      );
    });
  });

  describe('AccessToken / RefreshToken', () => {
    it('should verify a valid access token', async () => {
      const user = createAuthUser();
      const token = await jwtService.signAccessToken(user);
      const payload = await jwtService.verifyAccessToken(token);
      expect(payload.id).toBe(user.id);
    });

    it('should verify a valid refresh token', async () => {
      const user = createAuthUser();
      const token = await jwtService.signRefreshToken(user);
      const payload = await jwtService.verifyRefreshToken(token);
      expect(payload.id).toBe(user.id);
    });

    it('should throw on invalid token payload', async () => {
      const key = await jose.generateKeyPair('RS256', { extractable: true });
      const privateKey = key.privateKey;
      const invalidToken = await new jose.SignJWT({ something: 'invalid' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);

      jest.spyOn(fs, 'readFileSync').mockReturnValue(await jose.exportSPKI(key.publicKey));
      await expect(jwtService.verifyAccessToken(invalidToken)).rejects.toThrow(
        'Invalid access token payload',
      );
      await expect(jwtService.verifyRefreshToken(invalidToken)).rejects.toThrow(
        'Invalid refresh token payload',
      );
      await expect(jwtService.verifyInternal(invalidToken)).rejects.toThrow(
        'Invalid internal token payload',
      );
    });
  });

  describe('Token Type and Algorithm Enforcement', () => {
    it('should throw when verifying AT with RT method', async () => {
      const user = createAuthUser();
      const at = await jwtService.signAccessToken(user);
      await expect(jwtService.verifyRefreshToken(at)).rejects.toThrow();
    });

    it('should throw for malformed tokens', async () => {
      await expect(jwtService.verifyAccessToken('not.a.jwt')).rejects.toThrow();
      await expect(jwtService.verifyAccessToken('')).rejects.toThrow();
      await expect(
        jwtService.verifyAccessToken('header.payload.signature.extra'),
      ).rejects.toThrow();
    });

    it('should throw when using a different key for verification', async () => {
      const user = createAuthUser();
      const otherKeys = await jose.generateKeyPair('RS256');
      const otherPublic = await jose.exportSPKI(otherKeys.publicKey);

      const token = await jwtService.signAccessToken(user);

      const otherConfig = { ...config, accessTokenPublicKeyPath: 'other-pub' };
      const otherSvc = new JwtService(otherConfig);

      jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (p === 'other-pub') return otherPublic;
        return '';
      });

      await expect(otherSvc.verifyAccessToken(token)).rejects.toThrow();
    });
  });
});
