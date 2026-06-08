export enum UserStream {
  USER_JOB_OUTBOX_SUCCESS = 'user:job:outbox:success',
  USER_JOB_OUTBOX_FAILURE = 'user:job:outbox:failure',
  USER_USERS = 'user:users',
  USER_AUTHORIZATIONS = 'user:authorizations',
  USER_BADGES = 'user:badges',
  USER_NOTIFICATIONS = 'user:notifications',
}

export enum EventStream {
  EVENT_JOB_OUTBOX_SUCCESS = 'event:job:outbox:success',
  EVENT_JOB_OUTBOX_FAILURE = 'event:job:outbox:failure',
  EVENT_EVENTS = 'event:events',
  EVENT_TAGS = 'event:tags',
  EVENT_REQUIREMENTS = 'event:requirements',
}

export enum PostStream {
  POST_JOB_OUTBOX_SUCCESS = 'post:job:outbox:success',
  POST_JOB_OUTBOX_FAILURE = 'post:job:outbox:failure',
  POST_CREATED = 'post-created',
  POST_DELETED = 'post-deleted',
}

export enum SocialStream {
  SOCIAL_JOB_OUTBOX_SUCCESS = 'social:job:outbox:success',
  SOCIAL_JOB_OUTBOX_FAILURE = 'social:job:outbox:failure',
  SOCIAL_POSTS = 'social:posts',
  SOCIAL_INTERACTIONS = 'social:interactions',
  SOCIAL_PARTICIPATIONS = 'social:participations',
  SOCIAL_PUBLICATIONS = 'social:publications',
  SOCIAL_RELATIONS = 'social:relations',
  SOCIAL_USER = 'social:user',
}

export enum WebsocketStream {
  WS_USER = 'ws:user',
  WS_EVENT = 'ws:event',
  WS_TAG = 'ws:tag',
  WS_BADGE = 'ws:badge',
}

export const Streams = {
  ...UserStream,
  ...EventStream,
  ...PostStream,
  ...SocialStream,
  ...WebsocketStream,
} as const;

export type Streams = UserStream | EventStream | PostStream | SocialStream | WebsocketStream;
