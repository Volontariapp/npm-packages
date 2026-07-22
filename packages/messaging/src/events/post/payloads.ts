import type { IEventIdPayload, IPostIdPayload, IUserIdPayload } from '../index.js';

export enum PostEventMessagingType {
  POST_CREATED = 'post.created',
  POST_DELETED = 'post.deleted',
  POST_EVENT_DELETED_SUCCESS = 'post_event.deleted_success',
  POST_EVENT_DELETED_FAILED = 'post_event.deleted_failed',
}

export interface IPostCreatedPayload
  extends IPostIdPayload,
    Partial<IEventIdPayload>,
    Partial<IUserIdPayload> {}

export interface IPostDeletedPayload extends IPostIdPayload, Partial<IUserIdPayload> {}

export interface IPostEventDeletedSuccessPayload extends IEventIdPayload, Partial<IUserIdPayload> {}
export interface IPostEventDeletedFailedPayload
  extends IEventIdPayload,
    Partial<IUserIdPayload> {
  errorReason?: string;
}
