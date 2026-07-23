import type {
  IEventIdPayload,
  IPostIdPayload,
  IUserIdPayload,
  ICommentIdPayload,
} from '../index.js';

export enum PostEventMessagingType {
  POST_CREATED = 'post.created',
  POST_DELETED = 'post.deleted',
  POST_EVENT_DELETED_SUCCESS = 'post_event.deleted_success',
  POST_EVENT_DELETED_FAILED = 'post_event.deleted_failed',
  COMMENT_CREATED = 'post.comment.created',
  COMMENT_DELETED = 'post.comment.deleted',
}

export interface IPostCreatedPayload
  extends IPostIdPayload,
    Partial<IEventIdPayload>,
    Partial<IUserIdPayload> {}

export interface IPostDeletedPayload extends IPostIdPayload, Partial<IUserIdPayload> {}

export interface IPostEventDeletedSuccessPayload extends IEventIdPayload, Partial<IUserIdPayload> {}
export interface IPostEventDeletedFailedPayload extends IEventIdPayload, Partial<IUserIdPayload> {
  errorReason?: string;
}
export interface ICommentCreatedPayload
  extends ICommentIdPayload,
    IPostIdPayload,
    Partial<IUserIdPayload> {
  authorId: string;
}

export interface ICommentDeletedPayload extends ICommentIdPayload, IPostIdPayload {}
