import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GatewayAuthConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  accessTokenPublicKeyPath!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  refreshTokenPublicKeyPath!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  internalPrivateKeyPath!: string;

  @IsDefined()
  @IsNotEmpty()
  internalExpiresIn!: string | number;
}
