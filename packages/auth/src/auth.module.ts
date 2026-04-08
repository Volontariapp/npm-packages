import type { DynamicModule } from '@nestjs/common';
import { Module, Global } from '@nestjs/common';
import { JwtService } from './services/jwt.service.js';
import { AUTH_OPTIONS } from './constants/index.js';
import type { AuthConfig } from './interfaces/index.js';
import { GrpcMetadataHelper } from './services/grpc-metadata.helper.js';

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
        {
          provide: JwtService,
          useFactory: (opts: AuthConfig) => new JwtService(opts),
          inject: [AUTH_OPTIONS],
        },
        GrpcMetadataHelper,
      ],
      exports: [JwtService, GrpcMetadataHelper],
    };
  }
}
