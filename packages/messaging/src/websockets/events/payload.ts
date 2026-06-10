import type {
  IEmitterPayload,
  IEventSocialCreatedPayload,
  IEventSocialCreationFailedPayload,
  IEventSocialDeletedPayload,
  IEventSocialDeletionFailedPayload,
} from '../../index.js';

export interface IEventCreatedWebsocketPayload
  extends IEventSocialCreatedPayload,
    IEmitterPayload {}
export interface IEventCreationFailedWebsocketPayload
  extends IEventSocialCreationFailedPayload,
    IEmitterPayload {}
export interface IEventDeletedWebsocketPayload
  extends IEventSocialDeletedPayload,
    IEmitterPayload {}
export interface IEventDeletionFailedWebsocketPayload
  extends IEventSocialDeletionFailedPayload,
    IEmitterPayload {}
