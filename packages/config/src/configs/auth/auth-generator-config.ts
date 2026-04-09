import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { MsAuthConfig } from './ms-auth-config.js';

export class AuthGeneratorConfig extends MsAuthConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  accessTokenPrivateKeyPath!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  refreshTokenPrivateKeyPath!: string;

  @IsDefined()
  @IsNotEmpty()
  accessTokenExpiresIn!: string | number;

  @IsDefined()
  @IsNotEmpty()
  refreshTokenExpiresIn!: string | number;
}
