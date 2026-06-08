import type { PaginationRequest } from '../../../common/pagination.js';

export interface GetUserEventsRequest extends Partial<PaginationRequest> {}

export interface GetUserParticipationsRequest extends Partial<PaginationRequest> {}

export interface GetUserWishesRequest extends Partial<PaginationRequest> {}
