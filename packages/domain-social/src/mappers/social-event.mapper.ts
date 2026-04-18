import { SocialEventEntity } from '../entities/social-event.entity.js';
import { SocialEvent } from '../models/social-event.model.js';
import { EventId } from '../value-objects/ids.vo.js';

export class SocialEventMapper {
  static toModel(entity: SocialEventEntity): SocialEvent {
    return new SocialEvent(new EventId(entity.eventId));
  }

  static toEntity(eventId: EventId): SocialEventEntity {
    const entity = new SocialEventEntity();
    entity.eventId = eventId.value;
    return entity;
  }
}
