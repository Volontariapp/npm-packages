export enum UserStream {
  USER_JOB_OUTBOX_SUCCESS = 'user:job:outbox:success',
  USER_JOB_OUTBOX_FAILURE = 'user:job:outbox:failure',
  USER_CREATED = 'user:created',
  USER_DELETED = 'user:deleted',
}

export enum EventStream {
  EVENT_JOB_OUTBOX_SUCCESS = 'event:job:outbox:success',
  EVENT_JOB_OUTBOX_FAILURE = 'event:job:outbox:failure',
  EVENT_CREATED = 'event:created',
  EVENT_DELETED = 'event:deleted',
  EVENT_TAGS = 'event:tags',
  EVENT_REQUIREMENTS = 'event:requirements',
  EVENT_SUCCESSFULLY_CREATED = 'event:successfully_created',
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
  WS_USER_CREATED_FEEDBACK = 'ws:user-created-feedback',
  WS_USER_DELETED_FEEDBACK = 'ws:user-deleted-feedback',
  WS_POST_CREATED_FEEDBACK = 'ws:post-created-feedback',
  WS_POST_DELETED_FEEDBACK = 'ws:post-deleted-feedback',
  WS_EVENT_CREATED_FEEDBACK = 'ws:event-created-feedback',
  WS_EVENT_DELETED_FEEDBACK = 'ws:event-deleted-feedback',
}

export const Streams = {
  ...UserStream,
  ...EventStream,
  ...PostStream,
  ...SocialStream,
  ...WebsocketStream,
} as const;

export type Streams = UserStream | EventStream | PostStream | SocialStream | WebsocketStream;
