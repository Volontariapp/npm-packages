import type {
  IEventIdPayload,
  IPostIdPayload,
  IUserIdPayload,
  ICommentIdPayload,
} from '../index.js';

export enum PostEventMessagingType {
  POST_CREATED = 'post.created',
  POST_DELETED = 'post.deleted',
  POST_CREATION_SUCCESSFULL = 'post.creation_successfull',
  POST_CREATION_FAILED = 'post.creation_failed',
  POST_DELETION_SUCCESSFULL = 'post.deletion_successfull',
  POST_DELETION_FAILED = 'post.deletion_failed',
  POST_EVENT_DELETED_SUCCESS = 'post_event.deleted_success',
  POST_EVENT_DELETED_FAILED = 'post_event.deleted_failed',
  COMMENT_CREATED = 'post.comment.created',
  COMMENT_DELETED = 'post.comment.deleted',
  POST_LIKED = 'post.liked',
  POST_UNLIKED = 'post.unliked',
}

export interface IPostCreatedPayload
  extends IPostIdPayload,
    Partial<IEventIdPayload>,
    Partial<IUserIdPayload> {}

export interface IPostDeletedPayload extends IPostIdPayload, Partial<IUserIdPayload> {}

export interface IPostCreationSuccessfullPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload> {}

export interface IPostCreationFailedPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload> {
  failedEvents?: string[];
  errorReason?: string;
}

export interface IPostDeletionSuccessfullPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload> {}

export interface IPostDeletionFailedPayload
  extends IPostIdPayload,
    Partial<IUserIdPayload> {
  failedEvents?: string[];
  errorReason?: string;
}

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

export interface IPostLikedPayload extends IPostIdPayload, Partial<IUserIdPayload> {
  authorId: string;
}

export interface IPostUnlikedPayload extends IPostIdPayload, Partial<IUserIdPayload> {
  authorId: string;
}
