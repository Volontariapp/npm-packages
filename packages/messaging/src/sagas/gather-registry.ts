import { EventMessagingType } from '../events/index.js';
import { WebsocketMessagingType } from '../websockets/index.js';
import type { IGatherCompletionConfig } from './types.js';

/**
 * Identifiants uniques des Sagas / Gathers du monorepo.
 */
export const SagaGatherType = {
  EVENT_CREATION: 'EVENT_CREATION_GATHER',
  EVENT_DELETION: 'EVENT_DELETION_GATHER',
  POST_CREATION: 'POST_CREATION_GATHER',
  POST_DELETION: 'POST_DELETION_GATHER',
  USER_CREATION: 'USER_CREATION_GATHER',
  USER_DELETION: 'USER_DELETION_GATHER',
} as const;

export type SagaGatherType = (typeof SagaGatherType)[keyof typeof SagaGatherType];

/**
 * Source de vérité centralisant pour chaque Gather son événement cible, son stream et son événement WS.
 */
export const SAGA_GATHER_COMPLETION_MAPPING: Record<SagaGatherType, IGatherCompletionConfig> = {
  [SagaGatherType.EVENT_CREATION]: {
    targetEvent: EventMessagingType.EVENT_CREATED,
    stream: 'event:created',
    wsEvent: WebsocketMessagingType.EVENT_CREATED,
  },
  [SagaGatherType.EVENT_DELETION]: {
    targetEvent: EventMessagingType.EVENT_DELETED,
    stream: 'event:deleted',
    wsEvent: WebsocketMessagingType.EVENT_DELETED,
  },
  [SagaGatherType.POST_CREATION]: {
    targetEvent: EventMessagingType.POST_CREATED,
    stream: 'post:created',
    wsEvent: WebsocketMessagingType.POST_CREATED,
  },
  [SagaGatherType.POST_DELETION]: {
    targetEvent: EventMessagingType.POST_DELETED,
    stream: 'post:deleted',
    wsEvent: WebsocketMessagingType.POST_DELETED,
  },
  [SagaGatherType.USER_CREATION]: {
    targetEvent: EventMessagingType.USER_CREATED,
    stream: 'user:created',
    wsEvent: WebsocketMessagingType.USER_CREATED,
  },
  [SagaGatherType.USER_DELETION]: {
    targetEvent: EventMessagingType.USER_DELETED,
    stream: 'user:deleted',
    wsEvent: WebsocketMessagingType.USER_DELETED,
  },
} as const;

/**
 * Helper typé pour récupérer la configuration de complétion d'un Gather.
 */
export function getGatherCompletionConfig(gatherType: SagaGatherType): IGatherCompletionConfig {
  const config = SAGA_GATHER_COMPLETION_MAPPING[gatherType];
  if (!config) {
    throw new Error(`[Messaging] No completion config found for saga gather type: ${gatherType}`);
  }
  return config;
}
