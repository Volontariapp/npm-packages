import type { IEventPayload, ITagPayload } from '../event/payloads.js';
import type { IUserPayload, IBadgePayload, IUserCreatedPayload } from '../user/payloads.js';

export enum WebsocketEventMessagingType {
  WS_USER_CREATED = 'ws.user.created',
  WS_USER_UPDATED = 'ws.user.updated',
  WS_USER_DELETED = 'ws.user.deleted',
  WS_USER_BADGE_ADDED = 'ws.user.badge_added',
  WS_USER_BADGE_REMOVED = 'ws.user.badge_removed',
  WS_USER_IMPACT_SCORE_INCREMENTED = 'ws.user.impact_score_incremented',

  WS_EVENT_CREATED = 'ws.event.created',
  WS_EVENT_UPDATED = 'ws.event.updated',
  WS_EVENT_DELETED = 'ws.event.deleted',
  WS_EVENT_STATE_CHANGED = 'ws.event.state_changed',
  WS_EVENT_REQUIREMENTS_MANAGED = 'ws.event.requirements_managed',

  WS_TAG_CREATED = 'ws.tag.created',
  WS_TAG_UPDATED = 'ws.tag.updated',
  WS_TAG_DELETED = 'ws.tag.deleted',

  WS_BADGE_CREATED = 'ws.badge.created',
  WS_BADGE_UPDATED = 'ws.badge.updated',
  WS_BADGE_DELETED = 'ws.badge.deleted',
}

export interface IEventCreatedWebsocketPayload extends IEventPayload {}
export interface IEventUpdatedWebsocketPayload extends IEventPayload {}
export interface IEventDeletedWebsocketPayload extends IEventPayload {}
export interface IEventStateChangedWebsocketPayload extends IEventPayload {}
export interface IEventRequirementsManagedWebsocketPayload extends IEventPayload {}

export interface IUserCreatedWebsocketPayload extends IUserCreatedPayload {}
export interface IUserUpdatedWebsocketPayload extends IUserPayload {}
export interface IUserDeletedWebsocketPayload extends IUserPayload {}
export interface IUserBadgeAddedWebsocketPayload extends IUserPayload {}
export interface IUserBadgeRemovedWebsocketPayload extends IUserPayload {}
export interface IUserImpactScoreIncrementedWebsocketPayload extends IUserPayload {}

export interface ITagCreatedWebsocketPayload extends ITagPayload {}
export interface ITagUpdatedWebsocketPayload extends ITagPayload {}
export interface ITagDeletedWebsocketPayload extends ITagPayload {}

export interface IBadgeCreatedWebsocketPayload extends IBadgePayload {}
export interface IBadgeUpdatedWebsocketPayload extends IBadgePayload {}
export interface IBadgeDeletedWebsocketPayload extends IBadgePayload {}
