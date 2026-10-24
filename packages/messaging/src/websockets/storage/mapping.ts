import { StorageEventMessagingType } from '../../events/storage/payloads.js';
import { StorageWebsocketMessagingType } from './types.js';

export const STORAGE_EVENT_TO_WS_EVENT_MAPPING = {
  [StorageEventMessagingType.FILE_SCANNED]: StorageWebsocketMessagingType.FILE_SCANNED,
  [StorageEventMessagingType.FILE_REJECTED]: StorageWebsocketMessagingType.FILE_REJECTED,
  [StorageEventMessagingType.ATTACHMENT_REJECTED]:
    StorageWebsocketMessagingType.ATTACHMENT_REJECTED,
} as const;
