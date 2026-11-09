/** Nombre maximal d'identifiants pris en compte par une methode par lot (les suivants sont ignores). */
export const MAX_SOCIAL_BATCH_IDS = 100;

/** Identifiants par liste de getSearchExclusions (meme plafond que SearchEventsQuery de ms-event). */
export const MAX_SEARCH_EXCLUSION_IDS = 1000;

/**
 * Delai d'une transaction de lecture Neo4j, en ms. Sous la deadline de lecture de 2 s de la
 * gateway : passe ce delai, l'appelant a deja abandonne, et Neo4j arrete la requete au lieu de
 * continuer un travail que plus personne n'attend (panne a froid du 2026-11-09).
 */
export const NEO4J_READ_TRANSACTION_TIMEOUT_MS = 1800;
