import type {
  CreateEventCommand,
  CreateTagCommand,
  UpdateTagCommand,
} from '../../../event/event.command.js';
import type { SearchEventsQuery } from '../../../event/event.query.js';

/**
 * Public request to create a new event.
 * Matches gRPC but exposed for REST.
 */
export interface CreateEventRequest extends CreateEventCommand {}

/**
 * Public request to update an existing event.
 * REST-friendly: flatten fields from EventDTO.
 * In Gateway, this will be mapped to gRPC UpdateEventCommand + updateMask.
 */
export interface UpdateEventRequest extends Partial<CreateEventCommand> {}

/**
 * Public request to search events.
 */
export interface SearchEventsRequest extends Partial<SearchEventsQuery> {}

/**
 * Public request to manage event requirements.
 */
export interface ManageRequirementRequest {
  type: 'ADD' | 'REMOVE';
  name?: string;
  description?: string;
  neededQuantity?: number;
  requirementId?: string;
}

/**
 * Tag related requests
 */
export interface CreateTagRequest extends CreateTagCommand {}
export interface UpdateTagRequest extends Partial<UpdateTagCommand> {}
