import { EventMessagingType, type EventRegistry, type StreamEvent } from '@volontariapp/messaging';
import { EventType, EventState } from '@volontariapp/contracts';
import type { Redis } from 'ioredis';
import type { EventQueueModel } from '@volontariapp/database';
import { OutboxStatus } from '@volontariapp/database';
import type { Repository } from 'typeorm';
import type { ServiceType } from '@volontariapp/shared';

export function makeTestDbEvent(
  repository: Repository<EventQueueModel>,
  id: string,
  type: string,
  targetServices: ServiceType[],
): EventQueueModel {
  return repository.create({
    id,
    type,
    emitter: 'test-service',
    status: OutboxStatus.PENDING,
    payload: {
      after: {
        id,
        name: 'E2E Event',
        description: 'E2E Test Description',
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
        type: EventType.EVENT_TYPE_SOCIAL,
        state: EventState.EVENT_STATE_DRAFT,
        awardedImpactScore: 10,
        maxParticipants: 100,
        localisationName: 'Paris',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    attempts: 0,
    targetServices,
  } as Partial<EventQueueModel>);
}

export function makeTestEvent(id: string): StreamEvent<EventRegistry['event.changed']> {
  return {
    id,
    type: EventMessagingType.EVENT_CHANGED,
    emitter: 'test-emitter',
    version: 1,
    payload: {
      after: {
        before: null,
        after: {
          id,
          name: 'Test Event Name',
          description: 'Test Event Description',
          startAt: new Date('2026-05-19T10:00:00.000Z'),
          endAt: new Date('2026-05-19T12:00:00.000Z'),
          type: EventType.EVENT_TYPE_SOCIAL,
          state: EventState.EVENT_STATE_DRAFT,
          awardedImpactScore: 10,
          maxParticipants: 10,
          organizerId: 'org-id',
          localisationName: 'Paris',
          createdAt: new Date('2026-05-19T08:00:00.000Z'),
          updatedAt: new Date('2026-05-19T08:00:00.000Z'),
        },
      },
    },
    createdAt: new Date('2026-05-19T08:00:00.000Z').toISOString(),
  };
}

export async function pushTestEventToStream(
  redis: Redis,
  streamName: string,
  id: string,
  eventPayload = makeTestEvent(id),
): Promise<string> {
  const fields = [
    'id',
    id,
    'type',
    eventPayload.type,
    'emitter',
    eventPayload.emitter,
    'version',
    eventPayload.version.toString(),
    'createdAt',
    eventPayload.createdAt,
    'event',
    JSON.stringify(eventPayload),
  ];
  return (await redis.call('XADD', streamName, '*', ...fields)) as string;
}
