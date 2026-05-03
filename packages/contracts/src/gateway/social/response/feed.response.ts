import type {
  GetUserPostsResponse,
  GetFeedResponse,
  AdminGetUserPostsResponse,
  AdminGetFeedResponse,
} from '../../../social/social.responses.js';

export interface GetUserPostsWebResponse extends GetUserPostsResponse {}
export interface GetFeedWebResponse extends GetFeedResponse {}
export interface AdminGetUserPostsWebResponse extends AdminGetUserPostsResponse {}
export interface AdminGetFeedWebResponse extends AdminGetFeedResponse {}
