# @volontariapp/domain-ranking

Domaine du classement personnalisé des événements et des posts (`ms-ranking`). Il est partagé par
`ms-ranking`, `worker-ranking` et `post-processor-ranking`. Conception : `docs/matching/` du dépôt `docs`.

## Contenu

| Dossier | Rôle |
| :--- | :--- |
| `constants/` | Poids, seuils et versions de formule (`FORMULA_VERSION`, `FEED_FORMULA_VERSION`). Toute modification d'un poids incrémente la version. |
| `enums/` | Types de liste, sources, codes d'explication, seaux, origines. |
| `entities/` | Entités du domaine (une par table), sans dépendance à TypeORM. |
| `models/` | Modèles TypeORM des tables `ranking_*` et `registerRankingMappings()` (appelé à l'import du paquet, comme `domain-post`). |
| `repositories/` | Un `Postgres...Repository` par table, qui étend `BaseRepository` de `@volontariapp/database` (`@Injectable`, `@InjectRepository`), et leurs interfaces dans `repositories/interfaces/`. Le SQL spécifique y vit. |
| `services/` | Uniquement des classes de service `@Injectable`, une par fichier, au-dessus des interfaces de repository (journalisation et erreurs `DATABASE_ERROR` comme dans les autres domaines) : demandes de calcul, runs, listes, limites de débit, passes, souhaits, mentions, journal de likes, position chiffrée, purge de compte. |
| `policies/` | Règles de score **pures**, testables sans infrastructure : événements, popularité, posts, codes d'explication, score final, diversité, pénalités `PASS`. |
| `helpers/` | Fonctions utilitaires : maths, géographie, curseur opaque, chiffrement de la position, conversion des erreurs de base. |
| `exceptions/` | Exceptions du domaine (`BadRequestError`, `InternalServerError`). |
| `ports/` | Port `RankingScorer` (scoreur sémantique, Jev) et `NoopRankingScorer`. |

## Points à connaître

- Les dates de demande et de début de calcul viennent de l'horloge de la base (`clock_timestamp()`) et
  circulent en **texte** (microsecondes conservées) : les comparer en SQL, jamais en JavaScript.
- Le remplacement d'une liste est une transaction courte avec verrou consultatif et anti-écrasement ;
  son rappel `afterWrite` s'exécute dans la même transaction (job de suite).
- Les seaux à jetons exigent les conversions `::numeric`.
- Le journal de likes n'est **pas** chiffré (exception documentée, décision 30).
- La position est arrondie à 1 km puis chiffrée (`v1|userId|lat|lng`) avec une clé de 32 octets aléatoires.
- Les pénalités `PASS` renumérotent les éléments non servis : l'appelant persiste les nouveaux rangs
  (`updateEventRanks`) pour que le curseur `(listVersion, lastRank)` reste exact.

## Tests

- `yarn test` : tests unitaires des services purs.
- `yarn test:integration` : PostgreSQL réel (`postgres-ranking` de `ci-tools/docker-compose.yml`, port 5438).
  Les migrations de test sont dans `src/test/migrations/` ; la migration de domaine est la copie de
  `ms-ranking/src/migrations/domain/`.
