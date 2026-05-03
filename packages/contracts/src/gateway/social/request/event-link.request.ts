import type {
  LinkPostToEventCommand,
  UnlinkPostFromEventCommand,
} from '../../../social/social.command.js';
import type {
  GetEventRelatedToPostQuery,
  GetEventPostsQuery,
} from '../../../social/social.query.js';

export interface LinkPostToEventWebRequest extends LinkPostToEventCommand {}
export interface UnlinkPostFromEventWebRequest extends UnlinkPostFromEventCommand {}

export interface GetEventRelatedToPostWebRequest extends GetEventRelatedToPostQuery {}
export interface GetEventPostsWebRequest extends Partial<GetEventPostsQuery> {}
