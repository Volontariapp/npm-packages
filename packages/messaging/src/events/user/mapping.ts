import { UserEventMessagingType } from './payloads.js';
import { UserWebsocketMessagingType } from '../../websockets/users/types.js';

export const USER_EVENT_TO_WS_EVENT_MAPPING = {
  [UserEventMessagingType.USER_CREATED]: UserWebsocketMessagingType.USER_CREATED,
  [UserEventMessagingType.USER_DELETED]: UserWebsocketMessagingType.USER_DELETED,
  [UserEventMessagingType.USER_CREATION_SUCCESSFULL]: UserWebsocketMessagingType.USER_CREATED,
  [UserEventMessagingType.USER_CREATION_FAILED]: UserWebsocketMessagingType.USER_CREATION_FAILED,
  [UserEventMessagingType.USER_DELETION_SUCCESSFULL]: UserWebsocketMessagingType.USER_DELETED,
  [UserEventMessagingType.USER_DELETION_FAILED]: UserWebsocketMessagingType.USER_DELETION_FAILED,
} as const;
