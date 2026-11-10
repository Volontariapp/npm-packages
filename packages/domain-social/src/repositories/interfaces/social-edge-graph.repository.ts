import type { SocialEdgeKind } from '@volontariapp/messaging';

/** Etat que le graphe doit avoir pour un type de relation. */
export interface SocialEdgeTargetState {
  kind: SocialEdgeKind;
  present: boolean;
}

export interface SocialEdgeGraphResult {
  kind: SocialEdgeKind;
  present: boolean;
  /** Relations creees ou confirmees (present) ou supprimees (absent). 0 + present = noeud absent. */
  affected: number;
}

/** Application idempotente de l'etat de `social_edge` dans Neo4j. */
export interface ISocialEdgeGraphRepository {
  /**
   * Une seule session et une seule transaction d'ecriture pour tous les etats du couple.
   * Present : `MATCH` des deux noeuds puis `MERGE` (affected 0 = un noeud manque).
   * Absent : `DELETE` de la relation (affected 0 = rien a supprimer, sans erreur).
   */
  converge(
    fromId: string,
    toId: string,
    states: SocialEdgeTargetState[],
  ): Promise<SocialEdgeGraphResult[]>;
}
