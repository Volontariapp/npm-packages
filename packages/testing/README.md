# @volontariapp/testing

Une collection d'utilitaires de tests pour le monorepo Volontariapp.

## Installation

```bash
yarn add -D @volontariapp/testing
```

## Fonctionnalités

### Mocks

#### `createMock<T>()`

Crée un mock basé sur des Proxy pour n'importe quelle interface ou classe. Il crée automatiquement des fonctions mockées Jest pour chaque propriété accédée.

```typescript
import { createMock } from '@volontariapp/testing';

interface MyService {
  doSomething: (id: string) => Promise<void>;
}

const mock = createMock<MyService>();
mock.doSomething.mockResolvedValue(undefined);
```

#### `createMockLogger<T>()`

Crée une version mockée du logger. Vous pouvez passer une classe logger spécifique pour garantir une compatibilité totale des types.

```typescript
import { createMockLogger } from '@volontariapp/testing';
import { Logger } from '@volontariapp/logger';

const logger = createMockLogger<Logger>();
logger.info('Test');
expect(logger.info).toHaveBeenCalledWith('Test');
```

#### `createMockEventEmitter()`

Crée une version mockée d'un EventEmitter.

#### `createMockRequest(overrides?)` & `createMockResponse()`

Utilitaires pour tester les requêtes HTTP.

```typescript
import { createMockRequest, createMockResponse } from '@volontariapp/testing';

const req = createMockRequest({ body: { name: 'Test' } });
const res = createMockResponse();

myController.handle(req, res);
expect(res.status).toHaveBeenCalledWith(200);
```

### Utilitaires (Helpers)

...

#### Aides au temps (Time Helpers)

- `sleep(ms: number)`: Met l'exécution en pause.
- `waitFor(predicate: () => boolean, timeout?: number, interval?: number)`: Attend qu'une condition soit remplie.

#### Aides à l'aléatoire (Random Helpers)

- `randomUuid()`: Génère un UUID v4 aléatoire.
- `randomString(length?: number, alphabet?: string)`: Génère une chaîne aléatoire.
- `randomInt(min: number, max: number)`: Génère un entier aléatoire.
- `randomEmail(domain?: string)`: Génère un email aléatoire.
