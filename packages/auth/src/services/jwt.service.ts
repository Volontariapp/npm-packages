import * as jose from 'jose';
import type { CryptoKey } from 'jose';
import fs from 'node:fs';
import { InternalServerError } from '@volontariapp/errors';
import type { AuthConfig, AuthUser } from '../interfaces/index.js';

export class JwtService {
  private internalPrivateKey?: CryptoKey;
  private internalPublicKey?: CryptoKey;
  private gatewayPublicKey?: CryptoKey;

  constructor(private readonly options: AuthConfig) {
    if (options.internalExpiresIn === '' || options.internalExpiresIn === 0) {
      throw new InternalServerError('Internal expiration time not configured', 'AUTH_CONFIG_ERROR');
    }
    if (options.gatewayExpiresIn === '' || options.gatewayExpiresIn === 0) {
      throw new InternalServerError('Gateway expiration time not configured', 'AUTH_CONFIG_ERROR');
    }
  }

  private async getInternalPrivateKey(): Promise<CryptoKey> {
    if (this.internalPrivateKey) return this.internalPrivateKey;
    if (this.options.internalPrivateKeyPath === undefined) {
      throw new InternalServerError(
        'Internal private key path not configured',
        'AUTH_CONFIG_ERROR',
      );
    }
    try {
      const key = fs.readFileSync(this.options.internalPrivateKeyPath, 'utf8');
      this.internalPrivateKey = await jose.importPKCS8(key, 'RS256');
      return this.internalPrivateKey;
    } catch (error) {
      throw new InternalServerError(
        `Failed to import internal private key: ${(error as Error).message}`,
        'AUTH_CONFIG_ERROR',
      );
    }
  }

  private async getInternalPublicKey(): Promise<CryptoKey> {
    if (this.internalPublicKey) return this.internalPublicKey;
    if (this.options.internalPublicKeyPath === undefined) {
      throw new InternalServerError('Internal public key path not configured', 'AUTH_CONFIG_ERROR');
    }
    try {
      const key = fs.readFileSync(this.options.internalPublicKeyPath, 'utf8');
      this.internalPublicKey = await jose.importSPKI(key, 'RS256');
      return this.internalPublicKey;
    } catch (error) {
      throw new InternalServerError(
        `Failed to import internal public key: ${(error as Error).message}`,
        'AUTH_CONFIG_ERROR',
      );
    }
  }

  private async getGatewayPublicKey(): Promise<CryptoKey> {
    if (this.gatewayPublicKey) return this.gatewayPublicKey;
    if (this.options.gatewayPublicKeyPath === undefined) {
      throw new InternalServerError('Gateway public key path not configured', 'AUTH_CONFIG_ERROR');
    }
    try {
      const key = fs.readFileSync(this.options.gatewayPublicKeyPath, 'utf8');
      this.gatewayPublicKey = await jose.importSPKI(key, 'RS256');
      return this.gatewayPublicKey;
    } catch (error) {
      throw new InternalServerError(
        `Failed to import gateway public key: ${(error as Error).message}`,
        'AUTH_CONFIG_ERROR',
      );
    }
  }

  async signInternal(user: AuthUser): Promise<string> {
    const key = await this.getInternalPrivateKey();
    const sessionPayload: jose.JWTPayload = { ...user } as jose.JWTPayload;

    const token = await new jose.SignJWT(sessionPayload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(this.options.internalExpiresIn)
      .sign(key);

    return token;
  }

  async verifyInternal(token: string): Promise<AuthUser> {
    const key = await this.getInternalPublicKey();
    const { payload } = await jose.jwtVerify(token, key, { algorithms: ['RS256'] });
    if (this.isAuthUser(payload)) {
      return payload;
    }
    throw new InternalServerError('Invalid internal token payload', 'AUTH_TOKEN_ERROR');
  }

  async verifyExternal(token: string): Promise<AuthUser> {
    const key = await this.getGatewayPublicKey();
    const { payload } = await jose.jwtVerify(token, key, { algorithms: ['RS256'] });
    if (this.isAuthUser(payload)) {
      return payload;
    }
    throw new InternalServerError('Invalid external token payload', 'AUTH_TOKEN_ERROR');
  }

  private isAuthUser(payload: jose.JWTPayload): payload is AuthUser {
    const p = payload as Record<string, unknown>;
    return typeof p['id'] === 'string' && typeof p['role'] === 'string';
  }
}
