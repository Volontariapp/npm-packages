import type { IEventIdPayload, IPostIdPayload, IUserIdPayload } from '../index.js';

export enum SocialEventMessagingType {
  // === CREATION ===
  // EVENT
  EVENT_SOCIAL_CREATED = 'event_social.created',
  EVENT_SOCIAL_CREATION_FAILED = 'event_social.creation_failed',
  // POST
  POST_SOCIAL_CREATED = 'post_social.created',
  POST_SOCIAL_CREATION_FAILED = 'post_social.creation_failed',
  // USER
  USER_SOCIAL_CREATED = 'user_social.created',
  USER_SOCIAL_CREATION_FAILED = 'user_social.creation_failed',

  // === DELETION ===
  // EVENT
  EVENT_SOCIAL_DELETED = 'event_social.deleted',
  EVENT_SOCIAL_DELETION_FAILED = 'event_social.deletion_failed',
  // POST
  POST_SOCIAL_DELETED = 'post_social.deleted',
  POST_SOCIAL_DELETION_FAILED = 'post_social.deletion_failed',
  // USER
  USER_SOCIAL_DELETED = 'user_social.deleted',
  USER_SOCIAL_DELETION_FAILED = 'user_social.deletion_failed',
}

// Par default le userId est le emitter mais si un admin cree un event pour un autre utilisateur, il faudra specifier le userId

export interface IEventSocialCreatedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}
export interface IEventSocialCreationFailedPayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {}
export interface IEventSocialDeletedPayload extends IEventIdPayload, Partial<IUserIdPayload> {}
export interface IEventSocialDeletionFailedPayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {}

// Un post peut etre lie avec un event
export interface IPostSocialCreatedPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload>,
    Partial<IEventIdPayload> {}
export interface IPostSocialCreationFailedPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload>,
    Partial<IEventIdPayload> {}
export interface IPostSocialDeletedPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload>,
    Partial<IEventIdPayload> {}
export interface IPostSocialDeletionFailedPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload>,
    Partial<IEventIdPayload> {}

export interface IUserSocialCreatedPayload extends Partial<IUserIdPayload> {}
export interface IUserSocialCreationFailedPayload extends Partial<IUserIdPayload> {}
export interface IUserSocialDeletedPayload extends Partial<IUserIdPayload> {}
export interface IUserSocialDeletionFailedPayload extends Partial<IUserIdPayload> {}
