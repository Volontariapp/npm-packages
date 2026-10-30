import type { PaginationResultVO } from './pagination-result.vo.js';

export class EventAttendeeVO {
  constructor(
    public readonly userId: string,
    public readonly registeredAt: Date,
    public readonly checkedInAt?: Date,
  ) {}
}

export class PaginatedAttendeesVO {
  constructor(
    public readonly attendees: EventAttendeeVO[],
    public readonly pagination: PaginationResultVO,
  ) {}
}
