export interface AuthConfig {
  internalPrivateKeyPath?: string;
  internalPublicKeyPath?: string;
  gatewayPublicKeyPath?: string;
  internalExpiresIn: number | string;
  gatewayExpiresIn: number | string;
}
