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

#### `createMockLogger<T>()`

Creates a mocked version of the logger. You can pass a specific logger class to ensure full type compatibility.

```typescript
import { createMockLogger } from '@volontariapp/testing';
import { Logger } from '@volontariapp/logger';

const logger = createMockLogger<Logger>();
logger.info('Test');
expect(logger.info).toHaveBeenCalledWith('Test');
```

#### `createMockEventEmitter()`

Creates a mocked version of an EventEmitter.

#### `createMockRequest(overrides?)` & `createMockResponse()`

Utilities for HTTP testing.

```typescript
import { createMockRequest, createMockResponse } from '@volontariapp/testing';

const req = createMockRequest({ body: { name: 'Test' } });
const res = createMockResponse();

myController.handle(req, res);
expect(res.status).toHaveBeenCalledWith(200);
```

### Helpers

...

#### Time Helpers

- `sleep(ms: number)`: Pause execution.
- `waitFor(predicate: () => boolean, timeout?: number, interval?: number)`: Wait for a condition.

#### Random Helpers

- `randomUuid()`: Generate random UUID v4.
- `randomString(length?: number, alphabet?: string)`: Generate random string.
- `randomInt(min: number, max: number)`: Generate random integer.
- `randomEmail(domain?: string)`: Generate random email.
