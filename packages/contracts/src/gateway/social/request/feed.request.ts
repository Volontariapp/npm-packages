import type {
  GetUserPostsQuery,
  GetFeedQuery,
  AdminGetUserPostsQuery,
  AdminGetFeedQuery,
} from '../../../social/social.query.js';

export interface GetUserPostsWebRequest extends Partial<GetUserPostsQuery> {}
export interface GetFeedWebRequest extends Partial<GetFeedQuery> {}
export interface AdminGetUserPostsWebRequest extends Omit<AdminGetUserPostsQuery, 'userId'> {}
export interface AdminGetFeedWebRequest extends Omit<AdminGetFeedQuery, 'userId'> {}
