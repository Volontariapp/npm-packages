export type LiveSharingStopReason =
  | 'ARRIVED' // detected by the client, or server fallback at 150 m
  | 'STOPPED' // voluntary stop, background, unmount, permission removed
  | 'EVENT_ENDED'
  | 'LEFT' // the user leaves the event (unparticipate)
  | 'REVOKED'
  | 'EXPIRED';

/** Client to server. Coordinates are already rounded by the client; the server rounds again. */
export interface ILivePositionClientPayload {
  eventId: string;
  latitude: number;
  longitude: number;
}

export interface ILiveParticipantPosition {
  userId: string;
  /** Rounded to 3 decimals by the server. */
  latitude: number;
  /** Rounded to 3 decimals by the server. */
  longitude: number;
  /** ISO 8601 */
  updatedAt: string;
}

/** Server to organizer. */
export interface ILivePositionsUpdatedWebsocketPayload {
  eventId: string;
  positions: ILiveParticipantPosition[];
}

/** Server to the sharing user, and to the organizer. */
export interface ILiveSharingStoppedWebsocketPayload {
  eventId: string;
  userId: string;
  reason: LiveSharingStopReason;
}

/** Gateway to ws-service (internal HTTP call), never seen by the client. */
export interface ILiveGrantRequest {
  eventId: string;
  userId: string;
  organizerId: string;
  eventLatitude: number;
  eventLongitude: number;
  /** ISO 8601, event end plus 15 min, capped at 8 h (rechecked by ws-service). */
  expiresAt: string;
}

/** Gateway to ws-service, body of the internal DELETE. */
export interface ILiveRevokeRequest {
  eventId: string;
  userId: string;
  reason: Extract<LiveSharingStopReason, 'ARRIVED' | 'STOPPED' | 'LEFT'>;
}
