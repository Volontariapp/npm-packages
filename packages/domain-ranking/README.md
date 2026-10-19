# @volontariapp/domain-ranking

Domaine du classement personnalisé des événements et des posts (`ms-ranking`). Il est partagé par
`ms-ranking`, `worker-ranking` et `post-processor-ranking`. Conception : `docs/matching/` du dépôt `docs`.

## Contenu

| Dossier | Rôle |
| :--- | :--- |
| `constants/` | Poids, seuils et versions de formule (`FORMULA_VERSION`, `FEED_FORMULA_VERSION`). Toute modification d'un poids incrémente la version. |
| `services/` | Services **purs**, testables sans infrastructure : score structurel des événements, popularité, score des posts, codes d'explication, diversité, score final, curseur opaque, pénalités `PASS`, géographie, chiffrement de la position. |
| `ports/` | Port `RankingScorer` (scoreur sémantique, Jev) et `NoopRankingScorer`. |
| `entities/` | Entités du domaine (une par table), sans dépendance à TypeORM. |
| `models/` | Modèles TypeORM des tables `ranking_*` et `registerRankingMappings()` (appelé à l'import du paquet, comme `domain-post`). |
| `repositories/` | Un `Postgres...Repository` par table, qui étend `BaseRepository` de `@volontariapp/database` (`@Injectable`, `@InjectRepository`), et leurs interfaces dans `repositories/interfaces/`. Le SQL spécifique (demandes de calcul `needs_job`, remplacement atomique des listes, seaux à jetons, signaux, journal de likes, position chiffrée) vit dans ces dépôts. |

`RankingPurgeService` (suppression de compte) orchestre la purge des dix tables dans une seule transaction.

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
