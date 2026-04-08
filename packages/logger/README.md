# @volontariapp/logger

A cross-platform logging utility that works seamlessly in NodeJS, NestJS, and React Native. It outputs beautifully structured JSON logs or colored plain text logs based on the execution environment.

## Installation

```bash
npm install @volontariapp/logger
```

## Setup & Configuration

This logger is highly versatile and supports different instantiation strategies depending on the platform you're targeting.

### 1. NodeJS Project

For a typical NodeJS application or script, you can instantiate the logger directly. We recommend using `text` format for local development and `json` format in production.

```typescript
import { Logger } from '@volontariapp/logger';

const logger = new Logger({
  context: 'WorkerService',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'text',
  minLevel: 'info', // 'debug' | 'info' | 'warn' | 'error' | 'fatal'
});

logger.info('Worker initialized successfully.');
logger.error('Failed to sync data.', new Error('Connection timeout'));
```

### 2. NestJS Project

The logger adheres to NestJS's `LoggerService` interface out of the box (`log`, `error`, `warn`, `debug`, `verbose`). You can use it as a custom application-wide logger as well as via dependency injection.

**Application Bootstrap** (`main.ts`):
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@volontariapp/logger';

async function bootstrap() {
  // Use JSON formatting for structured logging in NestJS apps
  const appLogger = new Logger({ format: 'json', context: 'NestApplication' });

  const app = await NestFactory.create(AppModule, {
    logger: appLogger, 
  });

  await app.listen(3000);
}
bootstrap();
```

**Dependency Injection Module** (`logger.module.ts`):
```typescript
import { Module, Global } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';

const customLogger = new Logger({ format: 'json', context: 'RequestScope' });

@Global()
@Module({
  providers: [
    {
      provide: Logger,
      useValue: customLogger,
    },
  ],
  exports: [Logger],
})
export class LoggerModule {}
```

### 3. React Native Project

In React Native, it is often easier to read text logs in Metro Bundler, rather than a full JSON object. You can instantiate it locally to your specific component or as a Singleton for the entire app.

```typescript
import { Logger } from '@volontariapp/logger';

export const logger = new Logger({
  context: 'MobileApp',
  format: 'text', // Recommended for reacting native metro bundler console
  minLevel: 'debug',
});

// Inside a React Component
export const HomeScreen = () => {
  logger.debug('HomeScreen mounted', { timestamp: Date.now() });

  const handlePress = () => {
    logger.info('Button pressed');
  };

  return <Action handlePress={handlePress} />;
};
```

## Features

- **JSON & Text Output**: Switch formats based on the environment (`json` for Grafana/ELK, `text` for local development).
- **Log Levels**: Standard levels (`debug`, `info`, `warn`, `error`, `fatal`).
- **NestJS Compatible**: `log` and `verbose` wrappers ensure NestJS interface compatibility.
- **Micro-metadata**: Pass specific metadata objects simply. `logger.info('User Login', { userId: 1 })`.
