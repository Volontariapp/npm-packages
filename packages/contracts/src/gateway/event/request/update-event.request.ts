import type { CreateEventCommand } from '../../../event/event.command.js';

/**
 * Public request to update an existing event.
 * REST-friendly: flatten fields from EventDTO.
 * In Gateway, this will be mapped to gRPC UpdateEventCommand + updateMask.
 */
export interface UpdateEventRequest extends Partial<Omit<CreateEventCommand, 'startAt' | 'endAt'>> {
  startAt?: Date;
  endAt?: Date;
}
