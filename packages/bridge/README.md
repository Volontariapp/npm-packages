# @volontariapp/bridge

This library provides core database connection providers for the Volontariapp microservices architecture. It abstracts the initialization, connection, and disconnection logic for Postgres, Neo4j, and Redis databases.

## Features
- **PostgresProvider**: Uses TypeORM's `DataSource` underneath.
- **Neo4jProvider**: Uses the official `neo4j-driver`.
- **RedisProvider**: Uses `ioredis`.
- Strict typing and custom error handling using `@volontariapp/errors` instances for seamless microservice integration.

## Installation

```bash
yarn add @volontariapp/bridge @volontariapp/errors
```

## Abstract Usage

This package can be used outside NestJS environments or integrated manually.

### Postgres Example
```typescript
import { PostgresProvider, IPostgresConfig } from '@volontariapp/bridge';

const config: IPostgresConfig = {
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'my_db',
  synchronize: true, // TypeORM specific options are supported natively
};

const provider = new PostgresProvider(config);

async function start() {
  await provider.connect();
  const driver = provider.getDriver(); // Returns TypeORM DataSource
  
  // Use driver
  const result = await driver.query('SELECT NOW()');
  console.log(result);
  
  await provider.disconnect();
}

start();
```

### Redis Example
```typescript
import { RedisProvider, IRedisConfig } from '@volontariapp/bridge';

const config: IRedisConfig = {
  host: 'localhost',
  port: 6379,
};

const provider = new RedisProvider(config);

async function start() {
  await provider.connect();
  const redis = provider.getDriver();
  
  await redis.set('foo', 'bar');
  console.log(await redis.get('foo'));
  
  await provider.disconnect();
}

start();
```

### Neo4j Example
```typescript
import { Neo4jProvider, INeo4jConfig } from '@volontariapp/bridge';

const config: INeo4jConfig = {
  url: 'neo4j://localhost:7687',
  authToken: {
    principal: 'neo4j',
    credentials: 'password',
  },
};

const provider = new Neo4jProvider(config);

async function start() {
  await provider.connect();
  const neo4jDriver = provider.getDriver(); // native neo4j-driver instance
  
  const session = neo4jDriver.session();
  const res = await session.run('RETURN 1 as val');
  console.log(res.records[0].get('val'));
  
  await session.close();
  await provider.disconnect();
}

start();
```

## NestJS Usage
If you are building a NestJS project, use the `@volontariapp/bridge-nest` package wrapper to leverage NestJS lifecycle hooks and module isolation correctly.
