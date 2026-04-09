import { IsDefined, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DBConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  host!: string;

  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  port!: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  database?: string;
}
