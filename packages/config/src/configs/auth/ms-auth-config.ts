import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class MsAuthConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  internalPublicKeyPath!: string;
}
