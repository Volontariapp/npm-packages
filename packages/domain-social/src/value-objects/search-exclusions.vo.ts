/**
 * Ensembles de l'utilisateur qu'une recherche d'evenements laisse de cote. Chaque liste est
 * plafonnee (MAX_SEARCH_EXCLUSION_IDS) et triee ; un drapeau de troncature dit qu'il en existe plus.
 */
export class SearchExclusionsVO {
  constructor(
    /** Union des evenements crees, participes et souhaites demandes. */
    public readonly excludedEventIds: string[],
    /** Utilisateurs que j'ai bloques et utilisateurs qui m'ont bloque. */
    public readonly hiddenUserIds: string[],
    public readonly excludedEventIdsTruncated: boolean,
    public readonly hiddenUserIdsTruncated: boolean,
  ) {}
}
