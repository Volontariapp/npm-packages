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
  localisationName!: string;
  type!: EventType;
  state!: EventState;
  awardedImpactScore!: number;
  maxParticipants!: number;
  currentParticipants!: number;
  organizerId!: string;
  createdAt!: Date;
  updatedAt!: Date;

  requirements?: RequirementEntity[];
  tags?: TagEntity[];
}
