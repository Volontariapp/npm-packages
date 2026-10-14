import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { getGrpcOptions, STORAGE_SERVICE_NAME } from '@volontariapp/contracts-nest';
import { STORAGE_CLIENT_OPTIONS } from './constants.js';
import type {
  StorageClientAsyncOptions,
  StorageClientOptions,
  StorageClientOptionsFactory,
} from './interfaces/index.js';
import { StorageClientService } from './services/storage-client.service.js';

@Module({})
export class StorageClientModule {
  static register(options: StorageClientOptions = {}): DynamicModule {
    const url = options.url ?? 'localhost:50055';

    return {
      module: StorageClientModule,
      imports: [
        ClientsModule.register([
          {
            name: STORAGE_SERVICE_NAME,
            ...getGrpcOptions('STORAGE', url),
          },
        ]),
      ],
      providers: [
        {
          provide: STORAGE_CLIENT_OPTIONS,
          useValue: options,
        },
        StorageClientService,
      ],
      exports: [StorageClientService, ClientsModule],
    };
  }

  static registerAsync(asyncOptions: StorageClientAsyncOptions): DynamicModule {
    const clientsModuleAsync = ClientsModule.registerAsync([
      {
        name: STORAGE_SERVICE_NAME,
        imports: asyncOptions.imports ?? [],
        inject: [STORAGE_CLIENT_OPTIONS],
        useFactory: (options: StorageClientOptions) => {
          const url = options.url ?? 'localhost:50055';
          return getGrpcOptions('STORAGE', url);
        },
      },
    ]);

    const optionsProvider: Provider = this.createAsyncOptionsProvider(asyncOptions);

    return {
      module: StorageClientModule,
      imports: [...(asyncOptions.imports ?? []), clientsModuleAsync],
      providers: [optionsProvider, StorageClientService],
      exports: [StorageClientService, ClientsModule],
    };
  }

  private static createAsyncOptionsProvider(asyncOptions: StorageClientAsyncOptions): Provider {
    if (asyncOptions.useFactory) {
      return {
        provide: STORAGE_CLIENT_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject ?? [],
      };
    }

    const inject = asyncOptions.useExisting
      ? [asyncOptions.useExisting]
      : asyncOptions.useClass
        ? [asyncOptions.useClass]
        : [];
    return {
      provide: STORAGE_CLIENT_OPTIONS,
      useFactory: async (factory: StorageClientOptionsFactory) =>
        factory.createStorageClientOptions(),
      inject,
    };
  }
}
