import 'reflect-metadata';
import { IsDefined, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DBConfig {
  @IsDefined()
  @IsNotEmpty()
  host!: string;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;
}

class RedisConfig {
  @IsDefined()
  @IsNotEmpty()
  host!: string;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;
}

class MSURLsConfig {
  @IsDefined()
  @IsNotEmpty()
  msPostUrl!: string;

  @IsDefined()
  @IsNotEmpty()
  msUserUrl!: string;

  @IsDefined()
  @IsNotEmpty()
  msEventUrl!: string;
}

class WebSocketConfig {
  @IsDefined()
  @IsNotEmpty()
  host!: string;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;
}

class BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => DBConfig)
  db!: DBConfig;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;


}

class BaseConfigMS extends BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => MSURLsConfig)
  microServices!: MSURLsConfig;
}

class BaseConfigNativeApp  {
  @IsDefined()
  @ValidateNested()
  @Type(() => WebSocketConfig)
  webSocket!: WebSocketConfig;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;
}

export { BaseConfig, BaseConfigMS, BaseConfigNativeApp, DBConfig, RedisConfig, MSURLsConfig, WebSocketConfig };
