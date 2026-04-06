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

class BaseConfig {
  @IsDefined()
  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @IsDefined()
  @ValidateNested()
  @Type(() => DBConfig)
  db!: DBConfig;
}

export { BaseConfig, DBConfig, RedisConfig };
