import { DynamicModule, Module, Provider, FactoryProvider } from '@nestjs/common';
import { AUTH_OPTIONS, JwtService, type AuthConfig } from '@volontariapp/auth';
import { EMAIL_ENCRYPTION_SECRET } from './constants.js';
import { PostgresUserRepository } from './repositories/postgres-user.repository.js';
import { PostgresBadgeRepository } from './repositories/postgres-badge.repository.js';
import { UserService } from './services/user.service.js';
import { AuthService } from './services/auth.service.js';
import { BadgeService } from './services/badge.service.js';
import type {
  BaseType,
  DomainUserModuleAsyncOptions,
  DomainUserModuleOptions,
  InjectionToken,
} from './interfaces/module-options.interface.js';

@Module({})
export class DomainUserModule {
  private static readonly domainProviders: Provider[] = [
    UserService,
    AuthService,
    BadgeService,
    PostgresUserRepository,
    PostgresBadgeRepository,
    JwtService,
  ];

  private static createAuthProviders(options: DomainUserModuleOptions): Provider[] {
    return [
      {
        provide: AUTH_OPTIONS,
        useValue: options.auth,
      },
    ];
  }

  static register(options: DomainUserModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: EMAIL_ENCRYPTION_SECRET,
        useValue: options.emailEncryptionSecret,
      },
      ...this.createAuthProviders(options),
      ...this.domainProviders,
    ];

    return {
      module: DomainUserModule,
      providers,
      exports: providers,
    };
  }

  static registerAsync<T extends BaseType[]>(
    options: DomainUserModuleAsyncOptions<T>,
  ): DynamicModule {
    const secretProvider: FactoryProvider = {
      provide: EMAIL_ENCRYPTION_SECRET,
      useFactory: async (...args: T): Promise<string> => {
        const config = await options.useFactory(...args);
        return config.emailEncryptionSecret;
      },
      inject: options.inject as InjectionToken[],
    };

    const authOptionsProvider: FactoryProvider = {
      provide: AUTH_OPTIONS,
      useFactory: async (...args: T): Promise<AuthConfig> => {
        const config = await options.useFactory(...args);
        return config.auth;
      },
      inject: options.inject as InjectionToken[],
    };

    const providers: Provider[] = [secretProvider, authOptionsProvider, ...this.domainProviders];

    return {
      module: DomainUserModule,
      providers,
      exports: providers,
    };
  }
}
