export interface DomainUserModuleOptions {
  emailEncryptionSecret: string;
}

export type InjectionToken = string | symbol | (abstract new (...args: unknown[]) => unknown);

export interface DomainUserModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<DomainUserModuleOptions> | DomainUserModuleOptions;
  inject?: InjectionToken[];
}
