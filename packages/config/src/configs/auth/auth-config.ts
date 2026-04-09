import { IsOptional, IsString } from 'class-validator';

export class AuthConfig {
  @IsString()
  @IsOptional()
  internalPublicKeyPath?: string;

  @IsString()
  @IsOptional()
  internalPrivateKeyPath?: string;

  @IsString()
  @IsOptional()
  accessTokenPublicKeyPath?: string;

  @IsString()
  @IsOptional()
  accessTokenPrivateKeyPath?: string;

  @IsString()
  @IsOptional()
  refreshTokenPublicKeyPath?: string;

  @IsString()
  @IsOptional()
  refreshTokenPrivateKeyPath?: string;

  @IsOptional()
  internalExpiresIn?: string | number;

  @IsOptional()
  accessTokenExpiresIn?: string | number;

  @IsOptional()
  refreshTokenExpiresIn?: string | number;
}
