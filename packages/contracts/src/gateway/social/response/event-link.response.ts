import type {
  LinkPostToEventResponse,
  UnlinkPostFromEventResponse,
  GetEventRelatedToPostResponse,
  GetEventPostsResponse,
} from '../../../social/social.responses.js';

export interface LinkPostToEventWebResponse extends LinkPostToEventResponse {}
export interface UnlinkPostFromEventWebResponse extends UnlinkPostFromEventResponse {}
export interface GetEventRelatedToPostWebResponse extends GetEventRelatedToPostResponse {}
export interface GetEventPostsWebResponse extends GetEventPostsResponse {}
