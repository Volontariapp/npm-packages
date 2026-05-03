import type {
  CreateSocialUserCommand,
  DeleteSocialUserCommand,
  CreateSocialPostCommand,
  DeleteSocialPostCommand,
  CreateSocialEventCommand,
  DeleteSocialEventCommand,
} from '../../../social/social.command.js';
import type {
  GetSocialUserQuery,
  GetSocialPostQuery,
  GetSocialEventQuery,
} from '../../../social/social.query.js';

// Admin-only: user node lifecycle
export interface CreateSocialUserWebRequest extends CreateSocialUserCommand {}
export interface DeleteSocialUserWebRequest extends DeleteSocialUserCommand {}
export interface GetSocialUserWebRequest extends GetSocialUserQuery {}

// Post node lifecycle
export interface CreateSocialPostWebRequest extends CreateSocialPostCommand {}
export interface DeleteSocialPostWebRequest extends DeleteSocialPostCommand {}
export interface GetSocialPostWebRequest extends GetSocialPostQuery {}

// Event node lifecycle
export interface CreateSocialEventWebRequest extends CreateSocialEventCommand {}
export interface DeleteSocialEventWebRequest extends DeleteSocialEventCommand {}
export interface GetSocialEventWebRequest extends GetSocialEventQuery {}
