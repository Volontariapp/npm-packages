import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { BaseConfig } from './base-config.js';

export class FrontendConfig extends BaseConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  apiGatewayUrl!: string;
}
