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

  @IsDefined()
  @ValidateNested()
  @Type(() => MSURLsConfig)
  microServices!: MSURLsConfig;
}

export { BaseConfig, DBConfig, RedisConfig, MSURLsConfig };
