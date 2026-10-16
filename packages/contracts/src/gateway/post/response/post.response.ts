import type { CreatePostResponse, AdminCreatePostResponse } from '../../../post/post.responses.js';
import type { EventDTO } from '../../event/response/event.response.js';

/** Aggregated processing state of the media attached to a post. */
export type PostMediaStatusWeb = 'NONE' | 'PENDING' | 'READY' | 'REJECTED';

export interface PostMediaWeb {
  fileId: string;
  /** Display order of the media inside the post. */
  position: number;
  /** Public URL computed by the gateway from fileId. Absent until mediaStatus is READY. */
  url?: string;
}

export interface PostWeb {
  id: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  event?: EventDTO;
  media?: PostMediaWeb[];
  mediaStatus?: PostMediaStatusWeb;
}

export interface PostWebResponse {
  post: PostWeb;
}

export interface ListPostsWebResponse {
  posts: PostWeb[];
  totalCount: number;
}

// Self-service create response
export interface CreatePostWebResponse extends CreatePostResponse {}

// Admin create response
export interface AdminCreatePostWebResponse extends AdminCreatePostResponse {}
