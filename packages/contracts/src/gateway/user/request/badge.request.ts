import type {
  CreateBadgeCommand,
  UpdateBadgeCommand,
  DeleteBadgeCommand,
  AddBadgeToUserCommand,
  RemoveBadgeFromUserCommand,
  IncrementImpactScoreCommand,
} from '../../../user/user.command.js';
import type {
  GetBadgeQuery,
  ListBadgesQuery,
  GetBadgeBySlugQuery,
} from '../../../user/user.query.js';

// Badge management (admin-only)
export interface CreateBadgeRequest extends CreateBadgeCommand {}

export interface UpdateBadgeRequest extends Omit<UpdateBadgeCommand, 'badgeId'> {}

export interface DeleteBadgeRequest extends DeleteBadgeCommand {}

/**
 * Add badge to user.
 * userId comes from @Param(:userId).
 */
export interface AddBadgeToUserRequest extends Omit<AddBadgeToUserCommand, 'userId'> {}

/**
 * Remove badge from user.
 * userId comes from @Param(:userId).
 */
export interface RemoveBadgeFromUserRequest extends Omit<RemoveBadgeFromUserCommand, 'userId'> {}

/**
 * Increment user's impact score.
 * userId comes from @Param(:userId).
 */
export interface IncrementImpactScoreRequest extends Omit<IncrementImpactScoreCommand, 'userId'> {}

// Badge queries
export interface GetBadgeRequest extends GetBadgeQuery {}

export interface ListBadgesRequest extends Partial<ListBadgesQuery> {}

export interface GetBadgeBySlugRequest extends GetBadgeBySlugQuery {}
