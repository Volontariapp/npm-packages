import type {
  IEmitterPayload,
  IPostSocialCreatedPayload,
  IPostSocialCreationFailedPayload,
  IPostSocialDeletedPayload,
  IPostSocialDeletionFailedPayload,
  ICommentCreatedPayload,
  ICommentDeletedPayload,
} from '../../index.js';

export interface IPostCreatedWebsocketPayload extends IPostSocialCreatedPayload, IEmitterPayload {}
export interface IPostCreationFailedWebsocketPayload
  extends IPostSocialCreationFailedPayload,
    IEmitterPayload {}
export interface IPostDeletedWebsocketPayload extends IPostSocialDeletedPayload, IEmitterPayload {}
export interface IPostDeletionFailedWebsocketPayload
  extends IPostSocialDeletionFailedPayload,
    IEmitterPayload {}

export interface ICommentCreatedWebsocketPayload extends ICommentCreatedPayload, IEmitterPayload {}
export interface ICommentDeletedWebsocketPayload extends ICommentDeletedPayload, IEmitterPayload {}
