# @volontariapp/logger

Un utilitaire de log cross-platform qui fonctionne parfaitement sur NodeJS, NestJS et React Native. Il génère des logs JSON structurés ou des logs texte colorés selon l'environnement d'exécution.

## Installation

```bash
npm install @volontariapp/logger
```

## Configuration & Mise en place

Ce logger est très polyvalent et supporte différentes stratégies d'instanciation en fonction de la plateforme ciblée.

### 1. Projet NodeJS

Pour une application ou un script NodeJS classique, vous pouvez instancier le logger directement. Nous recommandons d'utiliser le format `text` pour le développement local et `json` en production.

```typescript
import { Logger } from '@volontariapp/logger';

const logger = new Logger({
  context: 'WorkerService',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'text',
  minLevel: 'info', // 'debug' | 'info' | 'warn' | 'error' | 'fatal'
});

logger.info('Worker initialisé avec succès.');
logger.error('Échec de synchronisation des données.', new Error('Connection timeout'));
```

### 2. Projet NestJS

Le logger respecte l'interface `LoggerService` de NestJS de manière native (`log`, `error`, `warn`, `debug`, `verbose`). Vous pouvez l'utiliser comme logger global de l'application ou via l'injection de dépendances.

**Initialisation de l'Application** (`main.ts`) :
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@volontariapp/logger';

async function bootstrap() {
  // Utilise le format JSON pour des logs structurés dans les applications NestJS
  const appLogger = new Logger({ format: 'json', context: 'NestApplication' });

  const app = await NestFactory.create(AppModule, {
    logger: appLogger, 
  });

  await app.listen(3000);
}
bootstrap();
```

**Module d'Injection de Dépendances** (`logger.module.ts`) :
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

### 3. Projet React Native

Sur React Native, il est souvent plus simple de lire des logs texte dans la console Metro Bundler plutôt qu'un objet JSON complet. Vous pouvez l'instancier localement pour un composant spécifique ou en Singleton pour toute l'application.

```typescript
import { Logger } from '@volontariapp/logger';

export const logger = new Logger({
  context: 'MobileApp',
  format: 'text', // Recommandé pour la console metro bundler de react native
  minLevel: 'debug',
});

// À l'intérieur d'un composant React
export const HomeScreen = () => {
  logger.debug('HomeScreen monté', { timestamp: Date.now() });

  const handlePress = () => {
    logger.info('Bouton cliqué');
  };

  return <Action handlePress={handlePress} />;
};
```

## Fonctionnalités

- **Sortie JSON & Texte** : Changez de format selon l'environnement (`json` pour Grafana/ELK, `text` pour le dev local).
- **Niveaux de Log** : Niveaux standards (`debug`, `info`, `warn`, `error`, `fatal`).
- **Compatible NestJS** : Les méthodes `log` et `verbose` garantissent la compatibilité avec l'interface NestJS.
- **Micro-metadata** : Passez facilement des objets de métadonnées. `logger.info('User Login', { userId: 1 })`.
