export interface AuthConfig {
  internalPrivateKeyPath?: string;
  internalPublicKeyPath?: string;
  accessTokenPrivateKeyPath?: string;
  accessTokenPublicKeyPath?: string;
  refreshTokenPrivateKeyPath?: string;
  refreshTokenPublicKeyPath?: string;
  readonly internalExpiresIn?: string | number;
  readonly accessTokenExpiresIn?: string | number;
  readonly refreshTokenExpiresIn?: string | number;
  /**
   * Seconds an internal token signed for a given identity is reused by `signInternal`.
   * Never beyond the token's own `exp` nor the access token's `exp`. 0 disables. Default 30.
   */
  readonly internalTokenReuseSeconds?: number;
  /**
   * Seconds a successfully verified internal or access token is kept, keyed by the full token
   * string. Never beyond the token's `exp`; failures are never cached. 0 disables. Default 30.
   */
  readonly verifiedTokenCacheSeconds?: number;
  /** Upper bound of entries per token cache (signing, internal, access). Default 2000. */
  readonly tokenCacheMaxEntries?: number;
}
