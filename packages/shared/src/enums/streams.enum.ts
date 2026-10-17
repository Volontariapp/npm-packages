export enum UserStream {
  USER_JOB_OUTBOX_SUCCESS = 'user:job:outbox:success',
  USER_JOB_OUTBOX_FAILURE = 'user:job:outbox:failure',
  USER_CREATED = 'user:created',
  USER_DELETED = 'user:deleted',
  USER_DELETED_POST = 'user:deleted:post',
  USER_DELETED_EVENT = 'user:deleted:event',
  USER_DELETED_STORAGE = 'user:deleted:storage',
  USER_DELETION_SUCCESS = 'user:deletion:success',
  USER_BADGE_AWARDED = 'user:badge_awarded',
  USER_IMPACT_SCORE_CREDITED = 'user:impact_score_credited',
  USER_AVATAR_REPLACED = 'user:avatar_replaced',
}

export enum EventStream {
  EVENT_JOB_OUTBOX_SUCCESS = 'event:job:outbox:success',
  EVENT_JOB_OUTBOX_FAILURE = 'event:job:outbox:failure',
  EVENT_CREATED = 'event:created',
  EVENT_DELETED = 'event:deleted',
  EVENT_TAGS = 'event:tags',
  EVENT_REQUIREMENTS = 'event:requirements',
  EVENT_SUCCESSFULLY_CREATED = 'event:successfully_created',
  EVENT_FINISHED = 'event:finished',
  EVENT_COVER_REPLACED = 'event:cover_replaced',
}

export enum PostStream {
  POST_JOB_OUTBOX_SUCCESS = 'post:job:outbox:success',
  POST_JOB_OUTBOX_FAILURE = 'post:job:outbox:failure',
  POST_CREATED = 'post-created',
  POST_DELETED = 'post-deleted',
  POST_SUCCESSFULLY_CREATED = 'post:successfully_created',
  COMMENT_CREATED = 'comment-created',
  COMMENT_DELETED = 'comment-deleted',
  POST_LIKED = 'post-liked',
  POST_UNLIKED = 'post-unliked',
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
  EVENT_SOCIAL_WISHED = 'event-social-wished',
  EVENT_SOCIAL_UNWISHED = 'event-social-unwished',
}

export enum StorageStream {
  STORAGE_JOB_OUTBOX_SUCCESS = 'storage:job:outbox:success',
  STORAGE_JOB_OUTBOX_FAILURE = 'storage:job:outbox:failure',
  STORAGE_FILE_SCANNED = 'storage:file_scanned',
  STORAGE_FILE_REJECTED = 'storage:file_rejected',
  STORAGE_ATTACHMENT_REJECTED = 'storage:attachment_rejected',
}

export enum WebsocketStream {
  WS_USER_CREATED_FEEDBACK = 'ws:user-created-feedback',
  WS_USER_DELETED_FEEDBACK = 'ws:user-deleted-feedback',
  WS_POST_CREATED_FEEDBACK = 'ws:post-created-feedback',
  WS_POST_DELETED_FEEDBACK = 'ws:post-deleted-feedback',
  WS_EVENT_CREATED_FEEDBACK = 'ws:event-created-feedback',
  WS_EVENT_DELETED_FEEDBACK = 'ws:event-deleted-feedback',

  WS_JOBS_OUTBOX_SUCCESS = 'ws:jobs-outbox-success',
  WS_JOBS_OUTBOX_FAILURE = 'ws:jobs-outbox-failure',
}

export const Streams = {
  ...UserStream,
  ...EventStream,
  ...PostStream,
  ...SocialStream,
  ...StorageStream,
  ...WebsocketStream,
} as const;

export type Streams =
  | UserStream
  | EventStream
  | PostStream
  | SocialStream
  | StorageStream
  | WebsocketStream;
