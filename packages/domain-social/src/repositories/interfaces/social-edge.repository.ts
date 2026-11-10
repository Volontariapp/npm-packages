import type { EntityManager } from '@volontariapp/database';
import type { SocialEdgeKind } from '@volontariapp/messaging';

/** Etat voulu des relations en Postgres (`social_edge`). Toujours sur le manager de l'appelant. */
export interface ISocialEdgeRepository {
  /** `INSERT ... ON CONFLICT DO NOTHING` : true si la ligne a ete creee, false si elle existait. */
  insertIfAbsent(
    manager: EntityManager,
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
  ): Promise<boolean>;
  /** `DELETE` : true si une ligne a ete supprimee, false si elle n'existait pas. */
  deleteIfPresent(
    manager: EntityManager,
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
  ): Promise<boolean>;
  exists(
    manager: EntityManager,
    kind: SocialEdgeKind,
    fromId: string,
    toId: string,
  ): Promise<boolean>;
  /** Supprime toutes les lignes ou le noeud (utilisateur, post ou evenement) est source ou cible. */
  deleteByNode(manager: EntityManager, nodeId: string): Promise<number>;
}
