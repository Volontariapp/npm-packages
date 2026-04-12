import type { EventType, EventState } from '@volontariapp/contracts';
import type { EventLocation } from '../value-objects/event-location.value-object.js';
import type { RequirementEntity } from './requirement.entity.js';
import type { TagEntity } from './tag.entity.js';

export class EventEntity {
  id!: string;
  name!: string;
  description!: string;
  startAt!: Date;
  endAt!: Date;
  location!: EventLocation;
  type!: EventType;
  state!: EventState;
  awardedImpactScore!: number;
  maxParticipants!: number;

  requirements?: RequirementEntity[];
  tags?: TagEntity[];
}
