# @volontariapp/config

## Overview
Le package `config` est responsable du chargement, du typage fort et de la validation centralisée de la configuration logicielle.
Totalement agnostique (pur Node.js), il garantit que n'importe quelle brique de Volontariapp (Microservice NestJS, Worker isolé, Consumer Outbox) puisse valider ses variables d'environnement de manière sécurisée (Fail Fast) avant le démarrage de l'application.

## Cinématique de Validation

```mermaid
graph TD
    ENV[.env ou OS Variables] --> L(Loader Service)
    L --> V[Class Validator (DTOs)]
    
    V -->|Erreur de Validation| F[Crash / Fail Fast]
    V -->|Succès| O[Objet de Configuration Typé]
    
    O --> MS(Microservice NestJS)
    O --> WK(Worker Isolé)
```

## Key Features
- **Typage Fort** : Les variables d'environnement sont castées et validées (ex: Port en `number`, URL en format valide) via `class-validator`.
- **Fail Fast** : Si une variable d'environnement critique manque, le système crashe au démarrage plutôt qu'au moment de son utilisation, évitant des bugs de production silencieux.
- **Portabilité** : Utilisable nativement, sans dépendance d'injection de framework.

## Exemple d'Utilisation

### Définition de la Configuration

```typescript
// definition.ts
import { IsString, IsNumber, IsUrl } from 'class-validator';

export class DatabaseConfig {
  @IsUrl()
  public readonly url!: string;

  @IsNumber()
  public readonly maxPoolSize: number = 10; // Default value
}

export class AppConfig {
  @IsString()
  public readonly environment!: string;
  
  // Imbrication validée
  public readonly database!: DatabaseConfig;
}
```

### Chargement au Démarrage (Bootstrap)

```typescript
// main.ts
import { loadConfig } from '@volontariapp/config';
import { AppConfig } from './definition';

// Va lire process.env, hydrater la classe et la valider
const config = loadConfig(AppConfig);

console.log(config.database.url); // Typé correctement, garanti d'être une URL valide
```
