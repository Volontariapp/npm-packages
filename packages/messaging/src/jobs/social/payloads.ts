export enum SocialJobType {
  FOLLOW_USER = 'social.follow_user',
  SOCIAL_EDGE_APPLY = 'social.edge_apply',
}

export interface IFollowUserPayload {
  followerId: string;
  followingId: string;
}

/** Relation entre un utilisateur (from) et sa cible (to), portee par la table `social_edge`. */
export enum SocialEdgeKind {
  /** utilisateur -> post */
  LIKE = 'LIKE',
  /** utilisateur -> utilisateur */
  FOLLOW = 'FOLLOW',
  /** utilisateur -> evenement */
  WISH = 'WISH',
  /** utilisateur -> evenement */
  PARTICIPATE = 'PARTICIPATE',
}

export enum SocialEdgeAction {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

/**
 * Job `SOCIAL_EDGE_APPLY` : fait converger Neo4j vers l'etat de `social_edge` pour un couple.
 * Le handler relit l'etat courant en Postgres (il ne rejoue pas `action`) ; `action` ne sert qu'a
 * choisir l'evenement metier a emettre apres l'application dans le graphe.
 */
export interface ISocialEdgeApplyPayload {
  kind: SocialEdgeKind;
  fromId: string;
  toId: string;
  action: SocialEdgeAction;
  /** Instant de l'intention (ISO 8601). */
  intentAt: string;
  /** Seconde relation du meme couple a faire converger dans la meme transaction (participer retire le souhait). */
  companionKind?: SocialEdgeKind;
}
