# @volontariapp/bridge-nest

This package provides a seamless integration of the core `@volontariapp/bridge` database connection providers into your NestJS applications.

By using `@volontariapp/bridge-nest`, your NestJS projects will natively support `onModuleInit` and `onModuleDestroy` lifecycle hooks. This automatically handles your database connections upon start-up, and gracefully tears them down on application exit. In case of issues, it uniformly propagates exceptions modeled by your custom error suite `BRIDGE_CONNECTION_FAILED`, etc.

## Features
- **PostgresBridgeModule**: Easy drop-in registration for Postgres connections via TypeORM.
- **Neo4jBridgeModule**: Global module to register a `neo4j-driver` provider.
- **RedisBridgeModule**: Global module for `ioredis` caches or stores.
- Custom Providers that can be injected wherever necessary, wrapped correctly inside Nest's context layer.

## Installation

```bash
yarn add @volontariapp/bridge-nest @volontariapp/bridge @volontariapp/errors @volontariapp/errors-nest
```

## Basic Usage

The modules are exported globally by leveraging `@Global()`. When you register one, the provider instantly becomes available to any feature modules in your application without needing to specifically import it into every `module.ts`.

### 1. Register Modules in Your App

You typically import these inside your `AppModule` or `DatabaseModule`:

```typescript
import { Module } from '@nestjs/common';
import { 
  PostgresBridgeModule, 
  Neo4jBridgeModule, 
  RedisBridgeModule 
} from '@volontariapp/bridge-nest';

@Module({
  imports: [
    PostgresBridgeModule.register({
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'pwd',
      database: 'my_db',
      synchronize: true,
    }),
    RedisBridgeModule.register({
      host: 'localhost',
      port: 6379,
    }),
    Neo4jBridgeModule.register({
      url: 'neo4j://localhost:7687',
      authToken: { principal: 'neo4j', credentials: 'password' },
    })
  ],
})
export class AppModule {}
```

### 2. Injecting the Providers

Use standard NestJS dependency injection using the provider classes directly in your service layers.

```typescript
import { Injectable } from '@nestjs/common';
import { NestPostgresProvider, NestRedisProvider, NestNeo4jProvider } from '@volontariapp/bridge-nest';

@Injectable()
export class UserService {
  constructor(
    private readonly postgres: NestPostgresProvider,
    private readonly redis: NestRedisProvider,
    private readonly neo4j: NestNeo4jProvider,
  ) {}

  async doSomething() {
    // Access native TypeORM DataSource
    const pgDriver = this.postgres.getDriver();
    await pgDriver.query('SELECT 1');

    // Access ioredis library
    const cache = this.redis.getDriver();
    await cache.set('auth_token', '12345');

    // Access neo4j driver
    const neoDriver = this.neo4j.getDriver();
    const session = neoDriver.session();
    await session.run('MATCH (n:User) RETURN n');
    await session.close();
  }
}
```

## Error Handling
Internally, these decorators and lifecycles intercept internal provider failures safely and transform them using the monorepo's shared `BRIDGE_CONNECTION_FAILED` and `BRIDGE_DISCONNECTION_FAILED` utilities. This ensures any database configuration blunders are communicated explicitly as a `500 InternalServerError`.
