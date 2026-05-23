export enum UserStream {
  USER_USERS = 'user:users',
  USER_AUTHORIZATIONS = 'user:authorizations',
  USER_BADGES = 'user:badges',
  USER_NOTIFICATIONS = 'user:notifications',
}

export enum EventStream {
  EVENT_EVENTS = 'event:events',
  EVENT_TAGS = 'event:tags',
  EVENT_REQUIREMENTS = 'event:requirements',
}

export enum PostStream {}

export enum SocialStream {
  SOCIAL_POSTS = 'social:posts',
  SOCIAL_INTERACTIONS = 'social:interactions',
  SOCIAL_PARTICIPATIONS = 'social:participations',
  SOCIAL_PUBLICATIONS = 'social:publications',
  SOCIAL_RELATIONS = 'social:relations',
  SOCIAL_USER = 'social:user',
}

export enum WebsocketStream {
  WS_USER = 'ws:user',
}

export const Streams = {
  ...UserStream,
  ...EventStream,
  ...PostStream,
  ...SocialStream,
  ...WebsocketStream,
} as const;

export type Streams = UserStream | EventStream | PostStream | SocialStream | WebsocketStream;
