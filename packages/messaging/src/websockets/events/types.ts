export enum EventWebsocketMessagingType {
  EVENT_CREATED = 'event.created',
  EVENT_DELETED = 'event.deleted',
  EVENT_CREATION_FAILED = 'event.creation_failed',
  EVENT_DELETION_FAILED = 'event.deletion_failed',

  // Event FallBack
  FALLBACK_CREATE_EVENT = 'event.fallback.create_event',
  FALLBACK_UPDATE_EVENT = 'event.fallback.update_event',
  FALLBACK_DELETE_EVENT = 'event.fallback.delete_event',
  FALLBACK_CHANGE_EVENT_STATE = 'event.fallback.change_event_state',
  FALLBACK_MANAGE_REQUIREMENTS = 'event.fallback.manage_requirements',
  FALLBACK_CREATE_TAG = 'event.fallback.create_tag',
  FALLBACK_UPDATE_TAG = 'event.fallback.update_tag',
  FALLBACK_DELETE_TAG = 'event.fallback.delete_tag',
}
