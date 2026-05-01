import type { DynamicModule, Provider } from '@nestjs/common';
import { Module, Global } from '@nestjs/common';
import { JwtService } from './services/jwt.service.js';
import { AUTH_OPTIONS } from './constants/index.js';
import type { AuthConfig } from './interfaces/index.js';
import { GrpcMetadataHelper } from './services/grpc-metadata.helper.js';
import { GrpcInternalInterceptor } from './interceptors/grpc-internal.interceptor.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { GrpcInternalGuard } from './guards/grpc-internal.guard.js';

@Global()
@Module({})
export class AuthModule {
  private static createCommonProviders(options: AuthConfig): Provider[] {
    return [
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
    ];
  }

  static register(options: AuthConfig): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        ...this.createCommonProviders(options),
        AccessTokenGuard,
        RefreshTokenGuard,
        RolesGuard,
        GrpcInternalGuard,
        GrpcInternalInterceptor,
      ],
      exports: [
        JwtService,
        GrpcMetadataHelper,
        AccessTokenGuard,
        RefreshTokenGuard,
        RolesGuard,
        GrpcInternalGuard,
        GrpcInternalInterceptor,
      ],
    };
  }

  static registerGateway(options: AuthConfig): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        ...this.createCommonProviders(options),
        AccessTokenGuard,
        RefreshTokenGuard,
        RolesGuard,
        GrpcInternalInterceptor,
      ],
      exports: [
        JwtService,
        GrpcMetadataHelper,
        AccessTokenGuard,
        RefreshTokenGuard,
        RolesGuard,
        GrpcInternalInterceptor,
      ],
    };
  }

  static registerMicroservice(options: AuthConfig): DynamicModule {
    return {
      module: AuthModule,
      providers: [...this.createCommonProviders(options), GrpcInternalGuard],
      exports: [JwtService, GrpcMetadataHelper, GrpcInternalGuard],
    };
  }
}
