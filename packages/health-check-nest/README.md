# @volontariapp/health-check-nest

Wrapper NestJS de la librairie @volontariapp/health-check.

Objectif principal:
- Utiliser les providers de @volontariapp/bridge-nest pour les connexions
- Utiliser @volontariapp/health-check pour les vérifications

Le module n'instancie pas lui-même les bases de données. Il vérifie les instances injectées par bridge-nest.

## Ce que fait la librairie

- Expose HealthModule pour brancher un endpoint health
- Expose HealthConfig pour choisir quelles DB vérifier
- Lit les providers Nest suivants via DI:
  - NestPostgresProvider
  - NestRedisProvider
  - NestNeo4jProvider
- Retourne un rapport compatible avec Terminus

## Installation

Depuis le monorepo:
- dépendance workspace déjà disponible

Depuis un projet externe:
- installer @volontariapp/health-check-nest
- installer ses pairs Nest (@nestjs/common, @nestjs/core, @nestjs/terminus)
- installer @volontariapp/bridge-nest

## Configuration

~~~ts
type SupportedDatabase = 'postgres' | 'redis' | 'neo4j';

type HealthConfig = {
  databases?: SupportedDatabase[];
  failOnMissingProvider?: boolean;
};
~~~

Comportement:
- databases absent: vérifie postgres + redis + neo4j
- failOnMissingProvider absent: true
- failOnMissingProvider true: erreur si un provider demandé n'est pas injecté
- failOnMissingProvider false: ignore les providers manquants

## Utilisation rapide (NestJS)

~~~ts
import { Module } from '@nestjs/common';
import {
  PostgresBridgeModule,
  RedisBridgeModule,
  Neo4jBridgeModule,
} from '@volontariapp/bridge-nest';
import { HealthModule } from '@volontariapp/health-check-nest';

@Module({
  imports: [
    PostgresBridgeModule.register({
      host: 'localhost',
      port: 5432,
      username: 'app',
      password: 'app',
      database: 'app_db',
      entities: [],
      synchronize: false,
    }),
    RedisBridgeModule.register({
      host: 'localhost',
      port: 6379,
    }),
    Neo4jBridgeModule.register({
      url: 'bolt://localhost:7687',
      authToken: {
        principal: 'neo4j',
        credentials: 'password',
      },
    }),
    HealthModule.register({
      databases: ['postgres', 'redis', 'neo4j'],
      failOnMissingProvider: true,
    }),
  ],
})
export class AppModule {}
~~~

Endpoint exposé:
- GET /health

## Exemple partiel (seulement postgres)

~~~ts
HealthModule.register({
  databases: ['postgres'],
  failOnMissingProvider: true,
});
~~~

## Exemple tolérant (skip des providers absents)

~~~ts
HealthModule.register({
  databases: ['postgres', 'redis'],
  failOnMissingProvider: false,
});
~~~

## Architecture recommandée

- Outbox runner Node pur:
  - crée les connexions via @volontariapp/bridge
  - vérifie via @volontariapp/health-check

- Microservice Nest:
  - crée les connexions via @volontariapp/bridge-nest
  - vérifie via @volontariapp/health-check-nest (qui délègue à @volontariapp/health-check)

## API exportée

- HealthModule
- HEALTH_CONFIG
- HealthConfig
- SupportedDatabase
 
