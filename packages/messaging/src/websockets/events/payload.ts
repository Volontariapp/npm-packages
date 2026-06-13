import type {
  IEmitterPayload,
  IEventSocialCreatedPayload,
  IEventSocialCreationFailedPayload,
  IEventSocialDeletedPayload,
  IEventSocialDeletionFailedPayload,
  IFallbackChangeEventStatePayload,
  IFallbackCreateEventPayload,
  IFallbackCreateTagPayload,
  IFallbackDeleteEventPayload,
  IFallbackDeleteTagPayload,
  IFallbackManageRequirementsPayload,
  IFallbackUpdateEventPayload,
  IFallbackUpdateTagPayload,
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

export interface IFallbackCreateEventWebsocketPayload
  extends IFallbackCreateEventPayload,
    IEmitterPayload {}
export interface IFallbackUpdateEventWebsocketPayload
  extends IFallbackUpdateEventPayload,
    IEmitterPayload {}
export interface IFallbackDeleteEventWebsocketPayload
  extends IFallbackDeleteEventPayload,
    IEmitterPayload {}
export interface IFallbackChangeEventStateWebsocketPayload
  extends IFallbackChangeEventStatePayload,
    IEmitterPayload {}
export interface IFallbackManageRequirementsWebsocketPayload
  extends IFallbackManageRequirementsPayload,
    IEmitterPayload {}
export interface IFallbackCreateTagWebsocketPayload
  extends IFallbackCreateTagPayload,
    IEmitterPayload {}
export interface IFallbackUpdateTagWebsocketPayload
  extends IFallbackUpdateTagPayload,
    IEmitterPayload {}
export interface IFallbackDeleteTagWebsocketPayload
  extends IFallbackDeleteTagPayload,
    IEmitterPayload {}
