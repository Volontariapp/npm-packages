import { Injectable, Inject } from '@nestjs/common';
import * as jose from 'jose';
import type { CryptoKey } from 'jose';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';
import { Logger } from '@volontariapp/logger';
import {
  CONFIG_ERROR,
  INVALID_TOKEN_PAYLOAD,
  VERIFY_TOKEN_FAILED,
} from '@volontariapp/errors-nest';
import type { AuthConfig, AuthUser } from '../interfaces/index.js';
import { AUTH_OPTIONS } from '../constants/index.js';
import { TokenCache } from './token-cache.js';

const DEFAULT_INTERNAL_TOKEN_REUSE_SECONDS = 30;
const DEFAULT_VERIFIED_TOKEN_CACHE_SECONDS = 30;
const DEFAULT_TOKEN_CACHE_MAX_ENTRIES = 2000;
/** A reused internal token always keeps at least this much validity for the callee. */
const INTERNAL_TOKEN_EXPIRY_MARGIN_MS = 60_000;

@Injectable()
export class JwtService {
  private internalPrivateKey?: CryptoKey;
  private internalPublicKey?: CryptoKey;
  private accessTokenPrivateKey?: CryptoKey;
  private accessTokenPublicKey?: CryptoKey;
  private refreshTokenPrivateKey?: CryptoKey;
  private refreshTokenPublicKey?: CryptoKey;
  private readonly logger = new Logger({ context: 'JwtService', format: 'json' });
  private readonly internalReuseMs: number;
  private readonly verifiedCacheMs: number;
  private readonly signedInternalTokens: TokenCache<string>;
  private readonly verifiedInternalTokens: TokenCache<AuthUser>;
  private readonly verifiedAccessTokens: TokenCache<AuthUser>;

  constructor(@Inject(AUTH_OPTIONS) private readonly options: AuthConfig) {
    this.internalReuseMs =
      this.nonNegative(options.internalTokenReuseSeconds, DEFAULT_INTERNAL_TOKEN_REUSE_SECONDS) *
      1000;
    this.verifiedCacheMs =
      this.nonNegative(options.verifiedTokenCacheSeconds, DEFAULT_VERIFIED_TOKEN_CACHE_SECONDS) *
      1000;
    const maxEntries = this.nonNegative(
      options.tokenCacheMaxEntries,
      DEFAULT_TOKEN_CACHE_MAX_ENTRIES,
    );
    this.signedInternalTokens = new TokenCache(this.internalReuseMs > 0 ? maxEntries : 0);
    this.verifiedInternalTokens = new TokenCache(this.verifiedCacheMs > 0 ? maxEntries : 0);
    this.verifiedAccessTokens = new TokenCache(this.verifiedCacheMs > 0 ? maxEntries : 0);
  }

  private nonNegative(value: number | undefined, fallback: number): number {
    if (value === undefined || !Number.isFinite(value) || value < 0) return fallback;
    return value;
  }

  private validateExpiration(expiresIn: string | number | undefined, type: string): void {
    if (expiresIn === undefined || expiresIn === '' || expiresIn === 0) {
      throw CONFIG_ERROR(`${type} expiration time not configured`);
    }
  }

  private async getInternalPrivateKey(): Promise<CryptoKey> {
    if (this.internalPrivateKey) return this.internalPrivateKey;
    if (!this.options.internalPrivateKeyPath) {
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
    if (!this.options.internalPublicKeyPath) {
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
    if (!this.options.accessTokenPrivateKeyPath) {
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
    if (!this.options.accessTokenPublicKeyPath) {
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
    if (!this.options.refreshTokenPrivateKeyPath) {
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
    if (!this.options.refreshTokenPublicKeyPath) {
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

  /**
   * Signs an internal token for `user`. The same payload (same access token, same identity)
   * gets the same internal token back for `internalTokenReuseSeconds`, bounded by the internal
   * token's `exp` (minus a margin) and by the `exp` carried by `user`.
   */
  async signInternal(user: AuthUser): Promise<string> {
    this.validateExpiration(this.options.internalExpiresIn, 'Internal');
    const cacheKey = this.signedInternalTokens.enabled ? JSON.stringify(user) : undefined;
    if (cacheKey !== undefined) {
      const cached = this.signedInternalTokens.get(cacheKey);
      if (cached !== undefined) return cached;
    }

    const key = await this.getInternalPrivateKey();
    const token = await this.sign(user, key, this.options.internalExpiresIn as string | number);

    if (cacheKey !== undefined) {
      const tokenExp = jose.decodeJwt(token).exp;
      const bounds = [Date.now() + this.internalReuseMs];
      if (typeof tokenExp === 'number') {
        bounds.push(tokenExp * 1000 - INTERNAL_TOKEN_EXPIRY_MARGIN_MS);
      }
      const userExp = user['exp'];
      if (typeof userExp === 'number') bounds.push(userExp * 1000);
      this.signedInternalTokens.set(cacheKey, token, Math.min(...bounds));
    }
    return token;
  }

  async verifyInternal<T extends AuthUser = AuthUser>(token: string): Promise<T> {
    const cached = this.verifiedInternalTokens.get(token);
    if (cached !== undefined) return { ...cached } as T;
    const key = await this.getInternalPublicKey();
    const payload = await this.verify<T>(token, key, 'internal');
    this.rememberVerified(this.verifiedInternalTokens, token, payload);
    return payload;
  }

  async signAccessToken(user: AuthUser): Promise<string> {
    this.validateExpiration(this.options.accessTokenExpiresIn, 'Access');
    const key = await this.getAccessTokenPrivateKey();
    return this.sign(user, key, this.options.accessTokenExpiresIn as string | number);
  }

  async verifyAccessToken<T extends AuthUser = AuthUser>(token: string): Promise<T> {
    const cached = this.verifiedAccessTokens.get(token);
    if (cached !== undefined) return { ...cached } as T;
    const key = await this.getAccessTokenPublicKey();
    const payload = await this.verify<T>(token, key, 'access');
    this.rememberVerified(this.verifiedAccessTokens, token, payload);
    return payload;
  }

  /** Keeps a copy of a verified payload until min(now + window, exp). Never caches failures. */
  private rememberVerified(cache: TokenCache<AuthUser>, token: string, payload: AuthUser): void {
    if (!cache.enabled) return;
    const exp = payload['exp'];
    if (typeof exp !== 'number') return;
    cache.set(token, { ...payload }, Math.min(Date.now() + this.verifiedCacheMs, exp * 1000));
  }

  async signRefreshToken(user: AuthUser): Promise<string> {
    this.validateExpiration(this.options.refreshTokenExpiresIn, 'Refresh');
    const key = await this.getRefreshTokenPrivateKey();
    return this.sign(user, key, this.options.refreshTokenExpiresIn as string | number);
  }

  async verifyRefreshToken<T extends AuthUser = AuthUser>(token: string): Promise<T> {
    const key = await this.getRefreshTokenPublicKey();
    return this.verify<T>(token, key, 'refresh');
  }

  private async sign(user: AuthUser, key: CryptoKey, expiresIn: string | number): Promise<string> {
    const sessionPayload: jose.JWTPayload = { ...user };
    return new jose.SignJWT(sessionPayload)
      .setProtectedHeader({ alg: 'RS256' })
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(key);
  }

  private async verify<T extends AuthUser = AuthUser>(
    token: string,
    key: CryptoKey,
    type: string,
  ): Promise<T> {
    try {
      const { payload } = await jose.jwtVerify(token, key, { algorithms: ['RS256'] });
      if (this.isAuthUser(payload)) {
        return payload as T;
      }
      throw INVALID_TOKEN_PAYLOAD(type);
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      this.logger.error(`Failed to verify ${type} token`, error);
      throw VERIFY_TOKEN_FAILED(type, (error as Error).message);
    }
  }

  private isAuthUser(payload: jose.JWTPayload): payload is AuthUser {
    return typeof payload['id'] === 'string' && typeof payload['role'] === 'string';
  }
}
