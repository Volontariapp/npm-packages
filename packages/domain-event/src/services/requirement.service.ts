import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { REQUIREMENT_NOT_FOUND, DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import type { IRequirementRepository } from '../repositories/interfaces/requirement.repository.js';
import { PostgresRequirementRepository } from '../repositories/postgres-requirement.repository.js';
import { RequirementEntity } from '../entities/requirement.entity.js';

@Injectable()
export class RequirementService {
  private readonly logger = new Logger({ context: RequirementService.name });

  constructor(
    @Inject(PostgresRequirementRepository)
    private readonly requirementRepository: IRequirementRepository,
  ) {}

  async findAll(): Promise<RequirementEntity[]> {
    try {
      return await this.requirementRepository.findAll();
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to fetch requirements', err);
      throw DATABASE_ERROR('fetching all requirements', err.message);
    }
  }

  async findById(id: string): Promise<RequirementEntity> {
    try {
      const req = await this.requirementRepository.findById(id);
      if (!req) {
        throw REQUIREMENT_NOT_FOUND(id);
      }
      return req;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to fetch requirement: ${id}`, err);
      throw DATABASE_ERROR(`finding requirement: ${id}`, err.message);
    }
  }

  async create(data: Partial<RequirementEntity>): Promise<RequirementEntity> {
    try {
      this.logger.log(`Creating requirement: ${String(data.name)}`);
      return await this.requirementRepository.create(data);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error('Failed to create requirement', err);
      throw DATABASE_ERROR('creating requirement', err.message);
    }
  }

  async update(id: string, data: Partial<RequirementEntity>): Promise<RequirementEntity> {
    try {
      await this.findById(id);
      const updated = await this.requirementRepository.update(id, data);
      if (!updated) {
        throw REQUIREMENT_NOT_FOUND(id);
      }
      return updated;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to update requirement: ${id}`, err);
      throw DATABASE_ERROR(`updating requirement: ${id}`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.findById(id);
      await this.requirementRepository.delete(id);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to delete requirement: ${id}`, err);
      throw DATABASE_ERROR(`deleting requirement: ${id}`, err.message);
    }
  }
}
