import type { RequirementEntity } from '../../entities/requirement.entity.js';

export interface IRequirementRepository {
  findById(id: string): Promise<RequirementEntity | null>;
  findAll(): Promise<RequirementEntity[]>;
  create(data: Partial<RequirementEntity>): Promise<RequirementEntity>;
  update(id: string, data: Partial<RequirementEntity>): Promise<RequirementEntity | null>;
  delete(id: string): Promise<boolean>;
}
