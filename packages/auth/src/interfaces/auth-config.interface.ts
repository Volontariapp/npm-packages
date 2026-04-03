export interface AuthConfig {
  internalSecret: string;
  gatewaySecret?: string;
  internalExpiresIn: string | number;
}
