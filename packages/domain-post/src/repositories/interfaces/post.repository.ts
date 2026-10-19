import type { PaginatedResult } from '@volontariapp/database';
import type { PostEntity } from '../../entities/index.js';
import type { PostMediaScanStatus } from '../../enums/index.js';

export interface CreatePostWithMediaOptions {
  fileIds?: string[];
  fileScanStatuses?: Record<string, PostMediaScanStatus>;
}

export interface ListRecentPostsByAuthorsOptions {
  /** Capped at MAX_AUTHOR_IDS_PER_READ. Ignored when allAuthors is true. */
  authorIds: string[];
  /** Cold start and complement: every author. */
  allAuthors?: boolean;
  since?: Date;
  /** Keeps a prolific author from starving the others. Applied before the global cap. */
  perAuthorLimit?: number;
  /** Capped at MAX_RECENT_POSTS_PER_READ. */
  limit?: number;
}

export interface IPostRepository {
  findById(id: string, relations?: string[], readerId?: string): Promise<PostEntity | null>;
  findByAuthorId(id: string, relations?: string[]): Promise<PostEntity[]>;
  findAll(relations?: string[]): Promise<PostEntity[]>;
  create(post: Partial<PostEntity>): Promise<PostEntity>;
  createWithPostCreated(
    data: Partial<PostEntity> & CreatePostWithMediaOptions,
  ): Promise<PostEntity>;
  update(id: string, data: Partial<PostEntity>): Promise<PostEntity | null>;
  updateMediaScanStatus(
    postId: string,
    fileId: string,
    scanStatus: PostMediaScanStatus,
  ): Promise<PostEntity | null>;
  delete(id: string): Promise<boolean>;
  deleteWithPostDeleted(id: string): Promise<boolean>;
  deleteByAuthorId(authorId: string): Promise<number>;
  search(searchTerm: string, readerId?: string): Promise<PostEntity[]>;
  listPaginated(
    page: number,
    limit: number,
    authorId?: string,
    readerId?: string,
  ): Promise<PaginatedResult<PostEntity>>;
  purgePostsByAuthor(authorId: string): Promise<number>;
  listRecentByAuthors(options: ListRecentPostsByAuthorsOptions): Promise<PostEntity[]>;
  listByIds(ids: string[]): Promise<PostEntity[]>;
}
