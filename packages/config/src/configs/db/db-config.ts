import { IsDefined, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BaseDbConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  host!: string;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;
}

export class DBConfig extends BaseDbConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  database!: string;
}
