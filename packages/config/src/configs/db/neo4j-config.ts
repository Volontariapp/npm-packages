import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { DBConfig } from './db-config.js';
import type { INeo4jAuthToken, INeo4jConfig } from '../../interfaces/database.config.interface.js';

export class Neo4jConfig extends DBConfig implements INeo4jConfig {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  scheme!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  authScheme!: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  realm!: string;

  get url(): string {
    return `${this.scheme}://${this.host}:${this.port.toString()}`;
  }

  get authToken(): INeo4jAuthToken {
    return {
      scheme: this.authScheme,
      principal: this.username,
      credentials: this.password,
      realm: this.realm,
    };
  }
}
