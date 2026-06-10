import type { IEventIdPayload, IPostIdPayload, IUserIdPayload } from '../index.js';

export enum PostEventMessagingType {
  POST_CREATED = 'post.created',
  POST_DELETED = 'post.deleted',
}

export interface IPostCreatedPayload
  extends IPostIdPayload,
    Partial<IEventIdPayload>,
    Partial<IUserIdPayload> {}

export interface IPostDeletedPayload extends IPostIdPayload, Partial<IUserIdPayload> {}
