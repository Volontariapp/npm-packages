import type { TagEntity } from '../../entities/tag.entity.js';

export interface ITagRepository {
  findById(id: string): Promise<TagEntity | null>;
  findByIds(ids: string[]): Promise<TagEntity[]>;
  findBySlug(slug: string): Promise<TagEntity | null>;
  findAll(): Promise<TagEntity[]>;
  create(tagData: Partial<TagEntity>): Promise<TagEntity>;
  update(id: string, tagData: Partial<TagEntity>): Promise<TagEntity | null>;
  delete(id: string): Promise<boolean>;
}
