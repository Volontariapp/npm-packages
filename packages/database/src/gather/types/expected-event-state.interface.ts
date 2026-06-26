import { EventStatus } from './event-status.enum.js';

export interface ExpectedEventState {
  eventType: string;
  status: EventStatus;
  updatedAt: string;
  errorReason?: string;
}
