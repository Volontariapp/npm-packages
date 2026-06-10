import type {
  IEmitterPayload,
  IUserSocialCreatedPayload,
  IUserSocialCreationFailedPayload,
  IUserSocialDeletedPayload,
  IUserSocialDeletionFailedPayload,
} from '../../index.js';

export interface IUserCreatedWebsocketPayload extends IUserSocialCreatedPayload, IEmitterPayload {}
export interface IUserCreationFailedWebsocketPayload
  extends IUserSocialCreationFailedPayload,
    IEmitterPayload {}
export interface IUserDeletedWebsocketPayload extends IUserSocialDeletedPayload, IEmitterPayload {}
export interface IUserDeletionFailedWebsocketPayload
  extends IUserSocialDeletionFailedPayload,
    IEmitterPayload {}
