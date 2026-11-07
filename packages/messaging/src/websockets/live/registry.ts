import type { ILivePositionClientPayload } from './payload.js';
import type { LiveClientMessageType } from './types.js';

/** Client to server messages, kept apart from WebsocketEventRegistry (what notifyUser sends). */
export interface LiveClientMessageRegistry {
  [LiveClientMessageType.LIVE_POSITION]: ILivePositionClientPayload;
}
