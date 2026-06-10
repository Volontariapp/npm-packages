import type {
  IEmitterPayload,
  IPostSocialCreatedPayload,
  IPostSocialCreationFailedPayload,
  IPostSocialDeletedPayload,
  IPostSocialDeletionFailedPayload,
} from '../../index.js';

export interface IPostCreatedWebsocketPayload extends IPostSocialCreatedPayload, IEmitterPayload {}
export interface IPostCreationFailedWebsocketPayload
  extends IPostSocialCreationFailedPayload,
    IEmitterPayload {}
export interface IPostDeletedWebsocketPayload extends IPostSocialDeletedPayload, IEmitterPayload {}
export interface IPostDeletionFailedWebsocketPayload
  extends IPostSocialDeletionFailedPayload,
    IEmitterPayload {}
