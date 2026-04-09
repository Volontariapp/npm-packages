import { IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseConfig } from './base-config.js';
import { MSURLsConfig } from './ms-urls-config.js';
import { MsAuthConfig } from './auth/auth-config.js';

export class BackendConfig extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => MSURLsConfig)
  microServices!: MSURLsConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => MsAuthConfig)
  auth!: MsAuthConfig;
}
