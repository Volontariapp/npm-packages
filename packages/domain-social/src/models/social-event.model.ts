import type { EventId } from '../value-objects/ids.vo.js';

export class SocialEvent {
  constructor(public readonly id: EventId) {}
}
