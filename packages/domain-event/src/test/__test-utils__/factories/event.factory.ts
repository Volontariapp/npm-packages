import { randomUUID } from 'node:crypto';
import { EventState, EventType } from '@volontariapp/contracts';
import { EventEntity } from '../../../entities/event.entity.js';
import { EventLocation } from '../../../value-objects/event-location.value-object.js';

const ONE_DAY_MS = 86_400_000;

export class EventFactory {
  static build(overrides: Partial<EventEntity> = {}): EventEntity {
    const uid = randomUUID().slice(0, 8);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + ONE_DAY_MS);
    return Object.assign(new EventEntity(), {
      id: randomUUID(),
      name: `Event ${uid}`,
      description: `Description for event ${uid}`,
      startAt: now,
      endAt: tomorrow,
      location: new EventLocation(48.8566, 2.3522),
      localisationName: 'Paris, France',
      type: EventType.EVENT_TYPE_SOCIAL,
      state: EventState.EVENT_STATE_DRAFT,
      awardedImpactScore: 10,
      maxParticipants: 100,
      currentParticipants: 0,
      organizerId: randomUUID(),
      createdAt: now,
      updatedAt: now,
      requirements: [],
      tags: [],
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<EventEntity> = {}): EventEntity[] {
    return Array.from({ length: count }, () => EventFactory.build(overrides));
  }

  static buildInput(
    overrides: Partial<Omit<EventEntity, 'id' | 'createdAt' | 'updatedAt'>> = {},
  ): Partial<EventEntity> {
    const uid = randomUUID().slice(0, 8);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + ONE_DAY_MS);
    return {
      name: `Event ${uid}`,
      description: `Description for event ${uid}`,
      startAt: now,
      endAt: tomorrow,
      location: new EventLocation(48.8566, 2.3522),
      localisationName: 'Paris, France',
      type: EventType.EVENT_TYPE_SOCIAL,
      state: EventState.EVENT_STATE_DRAFT,
      awardedImpactScore: 10,
      maxParticipants: 100,
      currentParticipants: 0,
      organizerId: randomUUID(),
      ...overrides,
    };
  }
}
