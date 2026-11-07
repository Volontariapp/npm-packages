export enum LiveWebsocketMessagingType {
  LIVE_POSITIONS_UPDATED = 'live.positions_updated',
  LIVE_SHARING_STOPPED = 'live.sharing_stopped',
}

/** Messages sent by the client (the websocket registry is otherwise server to client). */
export enum LiveClientMessageType {
  LIVE_POSITION = 'live.position',
}
