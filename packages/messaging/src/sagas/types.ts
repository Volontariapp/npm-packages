import type { EventMessagingType, EventRegistry } from '../events/index.js';
import type { WebsocketMessagingType } from '../websockets/index.js';

/**
 * Contrat d'output générique émis lors de la complétion d'un Gather (Succès ou Échec).
 */
export interface IGatherCompletionOutput<
  TEvent extends EventMessagingType = EventMessagingType,
  TPayload = TEvent extends keyof EventRegistry ? EventRegistry[TEvent] : Record<string, unknown>,
> {
  /** Événement métier à émettre dans Redis Outbox / Stream (ex: EventMessagingType.EVENT_CREATED) */
  targetEvent: TEvent;

  /** Nom du Stream Redis cible (ex: 'event:created') */
  stream: string;

  /** Payload typé associant l'événement métier */
  payload: TPayload;

  /** Événement WebSocket associé pour le dispatch aux clients (optionnel) */
  wsEvent?: WebsocketMessagingType;
}

/**
 * Métadonnées de configuration d'un Gather (Target Event + Stream + WS Event).
 */
export interface IGatherCompletionConfig<
  TEvent extends EventMessagingType = EventMessagingType,
> {
  targetEvent: TEvent;
  stream: string;
  wsEvent?: WebsocketMessagingType;
}
