import type { PaginatedResult } from '@volontariapp/database';
import type { PostEntity } from '../../entities/index.js';
import type { PostMediaScanStatus } from '../../enums/index.js';

export interface CreatePostWithMediaOptions {
  fileIds?: string[];
  fileScanStatuses?: Record<string, PostMediaScanStatus>;
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
}
