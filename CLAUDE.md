## Volontariapp npm-packages monorepo

Packages partagés (`@volontariapp/<nom>`, workspaces Yarn 4 dans `packages/*`), consommés par les microservices, l'API Gateway, les Workers et le frontend React Native.

### Packages

- `shared` — contrat commun backend/frontend (types, validations de base partagés avec `nativapp/`)
- `contracts` / `contracts-nest` — interfaces gRPC (pure TS, compatible front) / intégration NestJS
- `domain-event`, `domain-post`, `domain-social`, `domain-user` — définitions et contrats DDD par domaine métier
- `outbox` — pattern Transactional Outbox (pilier de l'architecture événementielle)
- `messaging` — contrats universels de messaging (Events et Jobs)
- `workers` — base abstraite de worker BullMQ (NestJS)
- `post-processors` — base abstraite de post-processor Redis Streams
- `auth` — utilitaires d'auth agnostiques (JWT), sans dépendance framework
- `crypto` — wrappers crypto (chiffrement sym/asym, hash, tokens)
- `errors` / `errors-nest` — erreurs métier/infra typées / extension NestJS
- `config` — chargement et validation typée de la config (fail fast)
- `database` — config/adaptateurs TypeORM + PostgreSQL
- `bridge` / `bridge-nest` — providers de connexion Postgres/Neo4j/Redis / lifecycle hooks NestJS
- `health-check` / `health-check-nest` — vérification de santé des connexions déjà instanciées / wrapper NestJS
- `logger` — logs cross-platform (Node, NestJS, React Native)
- `monitoring` — observabilité du cluster de services
- `validation-nest` — utilitaires de validation NestJS
- `eslint-config` — config ESLint flat partagée
- `testing` — utilitaires de test communs

### Versioning (Changesets)

- Ajouter un changeset après une modif : `yarn changeset`
- Build de tous les packages (topological) : `yarn build`
- Lint : `yarn lint` / `yarn lint:fix` — Tests : `yarn test`
- `yarn check-changelogs` (script `scripts/check-changelogs.sh`) est exécuté en CI pour vérifier qu'un changeset existe
- Le publish n'est pas local : la CI (`Volontariapp/ci-tools` réutilisable, `.github/workflows/ci.yml`) consomme les changesets et publie sur npm au merge sur `main`. `job-emergency-release.yml` permet un publish manuel de secours (`workflow_dispatch`, option `dry_run`)

### Propagation aux consommateurs

Pour le workflow générique (snapshot sur PR, publish au merge, qui consomme quoi), voir `.agents/skills/global/shared-npm-package-change/SKILL.md`.

---

## RTK - Rust Token Killer (Optimized)
All shell commands (`git`, `npm`, `jest`, etc.) are automatically proxied via `rtk` for 80% token savings.
- **Direct Usage:** `rtk gain` (analytics), `rtk discover` (missed savings).
- **Files:** Use `rtk read <file>`, `rtk ls`, `rtk find`, `rtk grep` for compressed agent output.
