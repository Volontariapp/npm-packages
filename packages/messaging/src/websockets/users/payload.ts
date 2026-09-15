import type {
  IEmitterPayload,
  IUserCreatedPayload,
  IUserCreationFailedPayload,
  IUserDeleledPayload,
  IUserDeletionFailedPayload,
} from '../../index.js';

export interface IUserCreatedWebsocketPayload extends IUserCreatedPayload, IEmitterPayload {}
export interface IUserCreationFailedWebsocketPayload
  extends IUserCreationFailedPayload,
    IEmitterPayload {}
export interface IUserDeletedWebsocketPayload extends IUserDeleledPayload, IEmitterPayload {}
export interface IUserDeletionFailedWebsocketPayload
  extends IUserDeletionFailedPayload,
    IEmitterPayload {}
