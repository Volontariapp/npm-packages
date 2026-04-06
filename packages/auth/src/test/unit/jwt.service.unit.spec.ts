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
  let gatewayPrivate: string;
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
    gatewayPrivate = await jose.exportPKCS8(gatewayKeys.privateKey);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path === 'internal-private-path') return internalPrivate;
      if (path === 'internal-public-path') return internalPublic;
      if (path === 'gateway-public-path') return gatewayPublic;
      if (path === 'gateway-private-path') return gatewayPrivate;
      throw new Error('File not found');
    });
    jwtService = new JwtService(config);
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

  describe('verifyExternal', () => {
    it('should verify a valid external token', async () => {
      const user = createAuthUser();

      const gatewaySvc = new JwtService({
        ...config,
        internalPrivateKeyPath: 'gateway-private-path',
      });

      const token = await gatewaySvc.signInternal(user);

      const payload = await jwtService.verifyExternal(token);
      expect(payload.id).toBe(user.id);
    });
  });
});
