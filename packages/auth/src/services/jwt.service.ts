import * as jose from 'jose';
import type { CryptoKey } from 'jose';
import fs from 'node:fs';
import { InternalServerError } from '@volontariapp/errors';
import {
  CONFIG_ERROR,
  INVALID_TOKEN_PAYLOAD,
  VERIFY_TOKEN_FAILED,
} from '@volontariapp/errors-nest';
import type { AuthConfig, AuthUser } from '../interfaces/index.js';

export class JwtService {
  private internalPrivateKey?: CryptoKey;
  private internalPublicKey?: CryptoKey;
  private accessTokenPrivateKey?: CryptoKey;
  private accessTokenPublicKey?: CryptoKey;
  private refreshTokenPrivateKey?: CryptoKey;
  private refreshTokenPublicKey?: CryptoKey;

  constructor(private readonly options: AuthConfig) {}

  private validateExpiration(expiresIn: string | number | undefined, type: string): void {
    if (expiresIn === undefined || expiresIn === '' || expiresIn === 0) {
      throw CONFIG_ERROR(`${type} expiration time not configured`);
    }
  }

  private async getInternalPrivateKey(): Promise<CryptoKey> {
    if (this.internalPrivateKey) return this.internalPrivateKey;
    if (this.options.internalPrivateKeyPath === undefined) {
      throw CONFIG_ERROR('Internal private key path not configured');
    }
    try {
      const key = fs.readFileSync(this.options.internalPrivateKeyPath, 'utf8');
      this.internalPrivateKey = await jose.importPKCS8(key, 'RS256');
      return this.internalPrivateKey;
    } catch (error) {
      throw CONFIG_ERROR(`Failed to import internal private key: ${(error as Error).message}`);
    }
  }

  private async getInternalPublicKey(): Promise<CryptoKey> {
    if (this.internalPublicKey) return this.internalPublicKey;
    if (this.options.internalPublicKeyPath === undefined) {
      throw CONFIG_ERROR('Internal public key path not configured');
    }
    try {
      const key = fs.readFileSync(this.options.internalPublicKeyPath, 'utf8');
      this.internalPublicKey = await jose.importSPKI(key, 'RS256');
      return this.internalPublicKey;
    } catch (error) {
      throw CONFIG_ERROR(`Failed to import internal public key: ${(error as Error).message}`);
    }
  }

  private async getAccessTokenPrivateKey(): Promise<CryptoKey> {
    if (this.accessTokenPrivateKey) return this.accessTokenPrivateKey;
    if (this.options.accessTokenPrivateKeyPath === undefined) {
      throw CONFIG_ERROR('Access private key path not configured');
    }
    try {
      const key = fs.readFileSync(this.options.accessTokenPrivateKeyPath, 'utf8');
      this.accessTokenPrivateKey = await jose.importPKCS8(key, 'RS256');
      return this.accessTokenPrivateKey;
    } catch (error) {
      throw CONFIG_ERROR(`Failed to import access private key: ${(error as Error).message}`);
    }
  }

  private async getAccessTokenPublicKey(): Promise<CryptoKey> {
    if (this.accessTokenPublicKey) return this.accessTokenPublicKey;
    if (this.options.accessTokenPublicKeyPath === undefined) {
      throw CONFIG_ERROR('Access public key path not configured');
    }
    try {
      const key = fs.readFileSync(this.options.accessTokenPublicKeyPath, 'utf8');
      this.accessTokenPublicKey = await jose.importSPKI(key, 'RS256');
      return this.accessTokenPublicKey;
    } catch (error) {
      throw CONFIG_ERROR(`Failed to import access public key: ${(error as Error).message}`);
    }
  }

  private async getRefreshTokenPrivateKey(): Promise<CryptoKey> {
    if (this.refreshTokenPrivateKey) return this.refreshTokenPrivateKey;
    if (this.options.refreshTokenPrivateKeyPath === undefined) {
      throw CONFIG_ERROR('Refresh private key path not configured');
    }
    try {
      const key = fs.readFileSync(this.options.refreshTokenPrivateKeyPath, 'utf8');
      this.refreshTokenPrivateKey = await jose.importPKCS8(key, 'RS256');
      return this.refreshTokenPrivateKey;
    } catch (error) {
      throw CONFIG_ERROR(`Failed to import refresh private key: ${(error as Error).message}`);
    }
  }

  private async getRefreshTokenPublicKey(): Promise<CryptoKey> {
    if (this.refreshTokenPublicKey) return this.refreshTokenPublicKey;
    if (this.options.refreshTokenPublicKeyPath === undefined) {
      throw CONFIG_ERROR('Refresh public key path not configured');
    }
    try {
      const key = fs.readFileSync(this.options.refreshTokenPublicKeyPath, 'utf8');
      this.refreshTokenPublicKey = await jose.importSPKI(key, 'RS256');
      return this.refreshTokenPublicKey;
    } catch (error) {
      throw CONFIG_ERROR(`Failed to import refresh public key: ${(error as Error).message}`);
    }
  }

  async signInternal(user: AuthUser): Promise<string> {
    this.validateExpiration(this.options.internalExpiresIn, 'Internal');
    const key = await this.getInternalPrivateKey();
    return this.sign(user, key, this.options.internalExpiresIn as string | number);
  }

  async verifyInternal(token: string): Promise<AuthUser> {
    const key = await this.getInternalPublicKey();
    return this.verify(token, key, 'internal');
  }

  async signAccessToken(user: AuthUser): Promise<string> {
    this.validateExpiration(this.options.accessTokenExpiresIn, 'Access');
    const key = await this.getAccessTokenPrivateKey();
    return this.sign(user, key, this.options.accessTokenExpiresIn as string | number);
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    const key = await this.getAccessTokenPublicKey();
    return this.verify(token, key, 'access');
  }

  async signRefreshToken(user: AuthUser): Promise<string> {
    this.validateExpiration(this.options.refreshTokenExpiresIn, 'Refresh');
    const key = await this.getRefreshTokenPrivateKey();
    return this.sign(user, key, this.options.refreshTokenExpiresIn as string | number);
  }

  async verifyRefreshToken(token: string): Promise<AuthUser> {
    const key = await this.getRefreshTokenPublicKey();
    return this.verify(token, key, 'refresh');
  }

  private async sign(user: AuthUser, key: CryptoKey, expiresIn: string | number): Promise<string> {
    const sessionPayload: jose.JWTPayload = { ...user } as jose.JWTPayload;
    return new jose.SignJWT(sessionPayload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(key);
  }

  private async verify(token: string, key: CryptoKey, type: string): Promise<AuthUser> {
    try {
      const { payload } = await jose.jwtVerify(token, key, { algorithms: ['RS256'] });
      if (this.isAuthUser(payload)) {
        return payload;
      }
      throw INVALID_TOKEN_PAYLOAD(type);
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      throw VERIFY_TOKEN_FAILED(type, (error as Error).message);
    }
  }

  private isAuthUser(payload: jose.JWTPayload): payload is AuthUser {
    const p = payload as Record<string, unknown>;
    return typeof p['id'] === 'string' && typeof p['role'] === 'string';
  }
}
