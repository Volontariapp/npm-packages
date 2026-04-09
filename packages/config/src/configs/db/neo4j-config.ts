import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { DBConfig } from './db-config.js';

export class Neo4jConfig extends DBConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  scheme!: string;
}
