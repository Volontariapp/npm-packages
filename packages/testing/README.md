# @volontariapp/testing

A collection of testing utilities for the Volontariapp monorepo.

## Installation

```bash
yarn add -D @volontariapp/testing
```

## Features

### Mocks

#### `createMock<T>()`
Creates a proxy-based mock for any interface or class. It automatically creates Jest mock functions for any property accessed.

```typescript
import { createMock } from '@volontariapp/testing';

interface MyService {
  doSomething: (id: string) => Promise<void>;
}

const mock = createMock<MyService>();
mock.doSomething.mockResolvedValue(undefined);
```

#### `createMockLogger()`
Creates a mocked version of the `@volontariapp/logger`.

```typescript
import { createMockLogger } from '@volontariapp/testing';

const logger = createMockLogger();
logger.info('Test');
expect(logger.info).toHaveBeenCalledWith('Test');
```

### Helpers

#### Time Helpers
- `sleep(ms: number)`: Pause execution.
- `waitFor(predicate: () => boolean, timeout?: number, interval?: number)`: Wait for a condition.

#### Random Helpers
- `randomUuid()`: Generate random UUID v4.
- `randomString(length?: number, alphabet?: string)`: Generate random string.
- `randomInt(min: number, max: number)`: Generate random integer.
- `randomEmail(domain?: string)`: Generate random email.
