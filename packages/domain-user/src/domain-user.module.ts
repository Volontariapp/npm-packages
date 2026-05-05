import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EMAIL_ENCRYPTION_SECRET } from './constants.js';
import { PostgresUserRepository } from './repositories/postgres-user.repository.js';
import { PostgresBadgeRepository } from './repositories/postgres-badge.repository.js';
import { UserService } from './services/user.service.js';
import { AuthService } from './services/auth.service.js';
import { BadgeService } from './services/badge.service.js';
import type {
  DomainUserModuleAsyncOptions,
  DomainUserModuleOptions,
} from './interfaces/module-options.interface.js';

@Module({})
export class DomainUserModule {
  /**
   * List of providers shared between sync and async registration.
   */
  private static readonly domainProviders: Provider[] = [
    UserService,
    AuthService,
    BadgeService,
    PostgresUserRepository,
    PostgresBadgeRepository,
  ];

  /**
   * Synchronous registration of the DomainUserModule.
   */
  static register(options: DomainUserModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: EMAIL_ENCRYPTION_SECRET,
        useValue: options.emailEncryptionSecret,
      },
      ...this.domainProviders,
    ];

    return {
      module: DomainUserModule,
      providers,
      exports: providers,
    };
  }

  /**
   * Asynchronous registration of the DomainUserModule (useful for injecting ConfigService).
   */
  static registerAsync(options: DomainUserModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: EMAIL_ENCRYPTION_SECRET,
        useFactory: async (...args: unknown[]) => {
          const config = await options.useFactory(...args);
          return config.emailEncryptionSecret;
        },
        inject: options.inject ?? [],
      },
      ...this.domainProviders,
    ];

    return {
      module: DomainUserModule,
      providers,
      exports: providers,
    };
  }
}
