import { SocialJobType } from './social/payloads.js';

/** Options de livraison BullMQ propres a un type de job (sinon les defauts de la file s'appliquent). */
export interface JobDeliveryOptions {
  attempts: number;
  backoff: { type: 'exponential' | 'fixed'; delay: number };
}

/**
 * `SOCIAL_EDGE_APPLY` : 12 tentatives en exponentiel depuis 1 s couvrent environ 68 min
 * (somme de 1 a 2048 s), assez pour un redemarrage de Neo4j ou un noeud cree en retard.
 */
export const JOB_DELIVERY_OPTIONS: Readonly<Record<string, JobDeliveryOptions>> = {
  [SocialJobType.SOCIAL_EDGE_APPLY]: {
    attempts: 12,
    backoff: { type: 'exponential', delay: 1000 },
  },
};

export function getJobDeliveryOptions(type: string): JobDeliveryOptions | undefined {
  return JOB_DELIVERY_OPTIONS[type];
}
