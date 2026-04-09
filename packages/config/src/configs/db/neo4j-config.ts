import { IsOptional, IsString } from 'class-validator';
import { DBConfig } from './db-config.js';

export class Neo4jConfig extends DBConfig {
  @IsString()
  @IsOptional()
  scheme?: string = 'neo4j';
}
