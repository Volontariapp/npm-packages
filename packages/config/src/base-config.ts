import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DBConfig {
  @IsNotEmpty()
  host!: string;

  @IsNumber()
  port!: number;
}

class RedisConfig {
  @IsNotEmpty()
  host!: string;

  @IsNumber()
  port!: number;
}

class BaseConfig {
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @ValidateNested()
  @Type(() => DBConfig)
  db!: DBConfig;
}

export { BaseConfig, DBConfig, RedisConfig };
