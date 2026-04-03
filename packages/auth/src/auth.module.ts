import type { DynamicModule } from '@nestjs/common';
import { Module, Global } from '@nestjs/common';
import { JwtService } from './jwt.service.js';
import { AUTH_OPTIONS } from './constants.js';
import type { AuthConfig } from './interfaces/auth-config.interface.js';
import { GrpcMetadataHelper } from './grpc-metadata.helper.js';

@Global()
@Module({})
export class AuthModule {
  static register(options: AuthConfig): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        {
          provide: AUTH_OPTIONS,
          useValue: options,
        },
        JwtService,
        GrpcMetadataHelper,
      ],
      exports: [JwtService, GrpcMetadataHelper],
    };
  }
}
