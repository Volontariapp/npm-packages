import type { PaginationRequest } from '@volontariapp/contracts';
import type { PaginatedIds } from '../../entities/paginated-ids.entity.js';

export interface IParticipationRepository {
  createEventNode(eventId: string): Promise<void>;
  deleteEventNode(eventId: string): Promise<void>;
  eventExists(eventId: string): Promise<boolean>;
  createUserEvent(userId: string, eventId: string): Promise<void>;
  deleteUserEvent(userId: string, eventId: string): Promise<void>;
  createParticipation(userId: string, eventId: string): Promise<void>;
  deleteParticipation(userId: string, eventId: string): Promise<void>;
  participationExists(userId: string, eventId: string): Promise<boolean>;
  getUserEvents(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getUserParticipations(userId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
  getEventParticipants(eventId: string, pagination: PaginationRequest): Promise<PaginatedIds>;
}
