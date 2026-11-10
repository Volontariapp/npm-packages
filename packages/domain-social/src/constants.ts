/** Nombre maximal d'identifiants pris en compte par une methode par lot (les suivants sont ignores). */
export const MAX_SOCIAL_BATCH_IDS = 100;

/** Identifiants par liste de getSearchExclusions (meme plafond que SearchEventsQuery de ms-event). */
export const MAX_SEARCH_EXCLUSION_IDS = 1000;

/**
 * Delai par defaut d'une transaction de lecture Neo4j, en ms. Sous la deadline de lecture de 2 s de
 * la gateway : passe ce delai, l'appelant a deja abandonne, et Neo4j arrete la requete au lieu de
 * continuer un travail que plus personne n'attend (panne a froid du 2026-11-09).
 */
export const NEO4J_READ_TRANSACTION_TIMEOUT_MS = 1800;

/** Variable d'environnement qui remplace le delai par defaut (pile E2E, base froide). */
export const NEO4J_READ_TRANSACTION_TIMEOUT_ENV = 'NEO4J_READ_TRANSACTION_TIMEOUT_MS';

/** Delai configure ; une valeur absente, non entiere ou non positive donne le defaut. */
export function neo4jReadTransactionTimeoutMs(
  env: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const raw = env[NEO4J_READ_TRANSACTION_TIMEOUT_ENV]?.trim();
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(value) && value > 0 ? value : NEO4J_READ_TRANSACTION_TIMEOUT_MS;
}

/** Table Postgres de l'etat voulu des relations (like, follow, souhait, participation). */
export const SOCIAL_EDGE_TABLE = 'social_edge';

/** Auteur des jobs et evenements ecrits pour les relations sociales. */
export const SOCIAL_EDGE_EMITTER = 'ms-social';

/**
 * Mode d'ecriture de ms-social : `sync` ecrit Neo4j dans la requete (et peut dupliquer l'etat dans
 * `social_edge` avec `mirrorEdge`), `async` n'ecrit que Postgres et laisse worker-social appliquer.
 */
export type SocialWriteMode = 'sync' | 'async';

export const DEFAULT_SOCIAL_WRITE_MODE: SocialWriteMode = 'sync';

/** Valeur inconnue ou absente : `sync` (retour arriere sans risque). */
export function parseSocialWriteMode(value: string | undefined): SocialWriteMode {
  return value === 'async' ? 'async' : DEFAULT_SOCIAL_WRITE_MODE;
}
