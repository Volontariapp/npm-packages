import type { AuthConfig } from '@volontariapp/auth';

export interface DomainUserModuleOptions {
  emailEncryptionSecret: string;
  auth: AuthConfig;
}

export type BaseType = object | string | number | boolean | symbol | undefined | null;

export type InjectionToken = string | symbol | (abstract new (...args: never[]) => object);

export interface DomainUserModuleAsyncOptions<T extends BaseType[]> {
  useFactory: (...args: T) => Promise<DomainUserModuleOptions> | DomainUserModuleOptions;
  inject?: InjectionToken[];
}
