export interface AuthConfig {
  internalSecret: string;
  gatewaySecret: string;
  internalExpiresIn: number;
  gatewayExpiresIn: number;
}
