import type { CreateEventCommand } from '../../../event/event.command.js';

/**
 * Public request to create a new event.
 * Matches gRPC but exposed for REST.
 */
export interface CreateEventRequest extends Omit<CreateEventCommand, 'startAt' | 'endAt'> {
  startAt?: Date;
  endAt?: Date;
}
