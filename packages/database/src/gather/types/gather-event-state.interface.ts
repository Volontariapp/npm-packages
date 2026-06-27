import { EventStatus } from './event-status.enum.js';

export interface GatherEventState {
  eventType: string;
  status: EventStatus;
  updatedAt: string;
  errorReason?: string;
}
