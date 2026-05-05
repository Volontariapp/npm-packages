import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/database/testing';
import type { EventQueuePusher } from '../../../../pushers/event-queue.pusher.js';

export type EventQueuePusherMock = jest.Mocked<EventQueuePusher>;

export const makeEventQueuePusherMock = (): EventQueuePusherMock => {
  return createMock<EventQueuePusher>();
};
