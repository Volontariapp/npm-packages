export const EVENT_COMMAND_METHODS = {
  CREATE_EVENT: 'CreateEvent',
  UPDATE_EVENT: 'UpdateEvent',
  CHANGE_EVENT_STATE: 'ChangeEventState',
  MANAGE_REQUIREMENTS: 'ManageRequirements',
  DELETE_EVENT: 'DeleteEvent',
} as const;

export const EVENT_QUERY_METHODS = {
  GET_EVENT: 'GetEvent',
  SEARCH_EVENTS: 'SearchEvents',
  LIST_REQUIREMENTS: 'ListRequirements',
} as const;

export const TAG_COMMAND_METHODS = {
  CREATE_TAG: 'CreateTag',
  UPDATE_TAG: 'UpdateTag',
  DELETE_TAG: 'DeleteTag',
} as const;

export const TAG_QUERY_METHODS = {
  GET_TAGS: 'GetTags',
} as const;
