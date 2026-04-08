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
}
