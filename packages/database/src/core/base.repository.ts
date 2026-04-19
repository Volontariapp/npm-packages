import type {
  Repository,
  FindOptionsWhere,
  ObjectLiteral,
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  QueryRunner,
  SelectQueryBuilder,
  UpdateResult,
  DeleteResult,
  SaveOptions,
  RemoveOptions,
} from 'typeorm';
import { Logger } from '@volontariapp/logger';
import { Like, In } from 'typeorm';
import type { Constructor } from './mapper.service.js';
import { databaseMapper } from './mapper.service.js';

export type SearchableFields<T> = Array<keyof T>;

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export abstract class BaseRepository<
  TModel extends ObjectLiteral,
  TEntity extends object,
  TId extends string | number = string | number,
> {
  protected readonly mapper = databaseMapper;
  protected readonly logger = new Logger({ context: this.constructor.name, format: 'json' });

  constructor(
    protected readonly repository: Repository<TModel>,
    protected readonly entityClass: Constructor<TEntity>,
    protected readonly modelClass: Constructor<TModel>,
  ) {}

  protected toEntity(model: TModel): TEntity {
    return this.mapper.map(model, this.modelClass, this.entityClass);
  }

  protected toEntities(models: TModel[]): TEntity[] {
    return this.mapper.mapArray(models, this.modelClass, this.entityClass);
  }

  protected toModel(entity: Partial<TEntity>): DeepPartial<TModel> {
    return this.mapper.map(
      entity as TEntity,
      this.entityClass,
      this.modelClass,
    ) as DeepPartial<TModel>;
  }

  protected buildIdWhere(id: TId): FindOptionsWhere<TModel> {
    const pkColumns = this.repository.metadata.primaryColumns;
    if (pkColumns.length === 0) {
      throw new Error(`No primary key defined on ${this.repository.metadata.name}`);
    }
    const pkName = pkColumns[0].propertyName;
    return { [pkName]: id } as FindOptionsWhere<TModel>;
  }

  async find(options?: FindManyOptions<TModel>): Promise<TEntity[]> {
    const models = await this.repository.find(options);
    return this.toEntities(models);
  }

  async findOne(where: FindOptionsWhere<TModel>): Promise<TEntity | null> {
    const model = await this.repository.findOneBy(where);
    return model ? this.toEntity(model) : null;
  }

  async findOneOrFail(where: FindOptionsWhere<TModel>): Promise<TEntity> {
    const model = await this.repository.findOneByOrFail(where);
    return this.toEntity(model);
  }

  async findOneWithOptions(options: FindOneOptions<TModel>): Promise<TEntity | null> {
    const model = await this.repository.findOne(options);
    return model ? this.toEntity(model) : null;
  }

  async findById(id: TId): Promise<TEntity | null> {
    return this.findOne(this.buildIdWhere(id));
  }

  async findByIds(ids: TId[]): Promise<TEntity[]> {
    const pkName = this.repository.metadata.primaryColumns[0].propertyName;
    const where = {
      [pkName]: In(ids),
    } as FindOptionsWhere<TModel>;
    const models = await this.repository.find({ where });
    return this.toEntities(models);
  }

  async findWithRelations(
    where: FindOptionsWhere<TModel>,
    relations: string[],
  ): Promise<TEntity | null> {
    const model = await this.repository.findOne({ where, relations });
    return model ? this.toEntity(model) : null;
  }

  async findAllWithRelations(
    relations: string[],
    options?: FindManyOptions<TModel>,
  ): Promise<TEntity[]> {
    const models = await this.repository.find({
      ...options,
      relations,
    });
    return this.toEntities(models);
  }

  async create(data: Partial<TEntity>, saveOptions?: SaveOptions): Promise<TEntity> {
    const modelData = this.toModel(data);
    const model = this.repository.create(modelData);
    const savedModel = await this.repository.save(model, saveOptions);
    return this.toEntity(savedModel);
  }

  async createMany(dataArray: Partial<TEntity>[], saveOptions?: SaveOptions): Promise<TEntity[]> {
    const modelsData = dataArray.map((d) => this.toModel(d));
    const models = this.repository.create(modelsData);
    const savedModels = await this.repository.save(models, saveOptions);
    return this.toEntities(savedModels);
  }

  async update(id: TId, data: Partial<TEntity>): Promise<TEntity | null> {
    const where = this.buildIdWhere(id);
    const exists = await this.exists(where);

    if (!exists) {
      return null;
    }

    const modelData = this.toModel(data);

    await this.repository.save({
      ...(modelData as Record<string, unknown>),
      ...where,
    } as DeepPartial<TModel>);

    const relationNames = this.repository.metadata.relations.map((r) => r.propertyName);
    return this.findWithRelations(where, relationNames);
  }

  async updateWhere(
    where: FindOptionsWhere<TModel>,
    data: Partial<TEntity>,
  ): Promise<UpdateResult> {
    const modelData = this.toModel(data) as Record<string, unknown>;
    const relationNames = this.repository.metadata.relations.map((r) => r.propertyName);
    const updateData = Object.fromEntries(
      Object.entries(modelData).filter(([key]) => !relationNames.includes(key)),
    );
    return this.repository.update(where, updateData as Parameters<Repository<TModel>['update']>[1]);
  }

  async upsert(data: Partial<TEntity>, conflictPaths: string[]): Promise<TEntity> {
    const modelData = this.toModel(data);
    await this.repository.upsert(
      modelData as Parameters<Repository<TModel>['upsert']>[0],
      conflictPaths,
    );
    const pkName = this.repository.metadata.primaryColumns[0].propertyName;
    const pkValue = (modelData as Record<string, unknown>)[pkName];
    if (pkValue !== undefined) {
      const found = await this.findOne({
        [pkName]: pkValue,
      } as FindOptionsWhere<TModel>);
      if (found) return found;
    }
    return this.mapper.map(modelData as TModel, this.modelClass, this.entityClass);
  }

  async delete(id: TId): Promise<boolean> {
    const where = this.buildIdWhere(id);
    const result = await this.repository.delete(where);
    return (result.affected ?? 0) > 0;
  }

  async deleteWhere(where: FindOptionsWhere<TModel>): Promise<DeleteResult> {
    return this.repository.delete(where);
  }

  async softDelete(id: TId): Promise<boolean> {
    const where = this.buildIdWhere(id);
    const result = await this.repository.softDelete(where);
    return (result.affected ?? 0) > 0;
  }

  async restore(id: TId): Promise<boolean> {
    const where = this.buildIdWhere(id);
    const result = await this.repository.restore(where);
    return (result.affected ?? 0) > 0;
  }

  async remove(entity: TEntity, removeOptions?: RemoveOptions): Promise<TEntity> {
    const model = this.toModel(entity) as TModel;
    const removed = await this.repository.remove(model, removeOptions);
    return this.toEntity(removed);
  }

  async count(where?: FindOptionsWhere<TModel>): Promise<number> {
    return this.repository.count(where ? { where } : undefined);
  }

  async exists(where: FindOptionsWhere<TModel>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async paginate(
    pagination: PaginationOptions,
    options?: FindManyOptions<TModel>,
  ): Promise<PaginatedResult<TEntity>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [models, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: this.toEntities(models),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async search(query: string, fields?: SearchableFields<TModel>): Promise<TEntity[]> {
    const searchableFields = fields ?? this.getDefaultSearchableFields();

    const where = searchableFields.map((field) => ({
      [field]: Like(`%${query}%`),
    })) as FindOptionsWhere<TModel>[];

    const models = await this.repository.find({ where });
    return this.toEntities(models);
  }

  async searchPaginated(
    query: string,
    pagination: PaginationOptions,
    fields?: SearchableFields<TModel>,
  ): Promise<PaginatedResult<TEntity>> {
    const searchableFields = fields ?? this.getDefaultSearchableFields();

    const where = searchableFields.map((field) => ({
      [field]: Like(`%${query}%`),
    })) as FindOptionsWhere<TModel>[];

    return this.paginate(pagination, { where });
  }

  createQueryBuilder(alias?: string): SelectQueryBuilder<TModel> {
    return this.repository.createQueryBuilder(alias ?? this.repository.metadata.tableName);
  }

  async executeInTransaction<TResult>(
    work: (queryRunner: QueryRunner) => Promise<TResult>,
  ): Promise<TResult> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner);
      await queryRunner.commitTransaction();
      this.logger.debug('Transaction committed');
      return result;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back due to error', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async increment(
    where: FindOptionsWhere<TModel>,
    field: keyof TModel & string,
    value: number,
  ): Promise<UpdateResult> {
    return this.repository.increment(where, field, value);
  }

  async decrement(
    where: FindOptionsWhere<TModel>,
    field: keyof TModel & string,
    value: number,
  ): Promise<UpdateResult> {
    return this.repository.decrement(where, field, value);
  }

  get metadata() {
    return this.repository.metadata;
  }

  private getDefaultSearchableFields(): SearchableFields<TModel> {
    return this.repository.metadata.columns
      .filter(
        (column) => column.type === String || column.type === 'varchar' || column.type === 'text',
      )
      .map((column) => column.propertyName as keyof TModel);
  }
}
