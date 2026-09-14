import { PostEventMessagingType } from './payloads.js';
import { PostWebsocketMessagingType } from '../../websockets/posts/types.js';

export const POST_EVENT_TO_WS_EVENT_MAPPING = {
  [PostEventMessagingType.POST_CREATED]: PostWebsocketMessagingType.POST_CREATED,
  [PostEventMessagingType.POST_DELETED]: PostWebsocketMessagingType.POST_DELETED,
  [PostEventMessagingType.POST_CREATION_SUCCESSFULL]: PostWebsocketMessagingType.POST_CREATED,
  [PostEventMessagingType.POST_CREATION_FAILED]: PostWebsocketMessagingType.POST_CREATION_FAILED,
  [PostEventMessagingType.POST_DELETION_SUCCESSFULL]: PostWebsocketMessagingType.POST_DELETED,
  [PostEventMessagingType.POST_DELETION_FAILED]: PostWebsocketMessagingType.POST_DELETION_FAILED,
} as const;
