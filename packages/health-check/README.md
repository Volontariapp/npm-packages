# @volontariapp/health-check

Bibliothèque Node.js pure pour vérifier la santé des connexions base de données déjà instanciées.

Objectif principal:
- Bridge crée et gère la connexion
- Health-check vérifie cette connexion

Cette lib ne doit pas instancier de base de données.

## Ce que fait la librairie

- Fournit un contrat standard de résultat de santé
- Fournit un provider abstrait pour implémenter un check
- Fournit un orchestrateur pour agréger plusieurs checks
- Fournit des providers prêts à l'emploi branchés sur @volontariapp/bridge:
  - PostgresBridgeHealthProvider
  - RedisBridgeHealthProvider
  - Neo4jBridgeHealthProvider

## Installation

Depuis le monorepo:
- dépendance workspace déjà disponible

Depuis un projet externe:
- installer @volontariapp/health-check
- installer aussi @volontariapp/bridge

## Utilisation rapide (Node pur)

~~~ts
import {
  DatabaseHealthOrchestrator,
  PostgresBridgeHealthProvider,
  RedisBridgeHealthProvider,
  Neo4jBridgeHealthProvider,
} from '@volontariapp/health-check';
import {
  PostgresProvider,
  RedisProvider,
  Neo4jProvider,
} from '@volontariapp/bridge';

const postgres = new PostgresProvider({
  host: 'localhost',
  port: 5432,
  username: 'app',
  password: 'app',
  database: 'app_db',
  entities: [],
  synchronize: false,
});

const redis = new RedisProvider({
  host: 'localhost',
  port: 6379,
});

const neo4j = new Neo4jProvider({
  url: 'bolt://localhost:7687',
  authToken: {
    principal: 'neo4j',
    credentials: 'password',
  },
});

await postgres.connect();
await redis.connect();
await neo4j.connect();

const orchestrator = new DatabaseHealthOrchestrator([
  new PostgresBridgeHealthProvider(postgres),
  new RedisBridgeHealthProvider(redis),
  new Neo4jBridgeHealthProvider(neo4j),
]);

const health = await orchestrator.run();
console.log(health);

await Promise.all([
  postgres.disconnect(),
  redis.disconnect(),
  neo4j.disconnect(),
]);
~~~

## Résultat attendu

Le résultat retourné par run() suit ce format:

~~~ts
type OrchestratedHealthResult = {
  status: 'ok' | 'error';
  checks: Array<{
    name: string;
    status: 'up' | 'down';
    message: string;
    error?: {
      name: string;
      message: string;
    };
  }>;
};
~~~

## API exportée

- AbstractDatabaseHealthProvider
- DatabaseHealthOrchestrator
- PostgresBridgeHealthProvider
- RedisBridgeHealthProvider
- Neo4jBridgeHealthProvider

## Bonnes pratiques

- Construire les connexions ailleurs (bridge, bridge-nest, bootstrap applicatif)
- Garder health-check focalisé sur la vérification
- Configurer host, port, credentials dans bridge, pas ici
- Réutiliser les mêmes instances pour l'app métier et le health endpoint
 
