import neo4j from 'neo4j-driver';
import type { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import { DATABASE_QUERY_ERROR } from '@volontariapp/errors-nest';
import { PaginatedIdsVO } from '../../value-objects/paginated-ids.vo.js';
import { PaginationResultVO } from '../../value-objects/pagination-result.vo.js';
import type { PaginationVO } from '../../value-objects/pagination.vo.js';

type Neo4jRecord = { get(key: string): unknown };

function toSafeInt(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value);
}

export abstract class Neo4jBaseRepository {
  constructor(protected readonly provider: NestNeo4jProvider) {}

  protected async read<T>(
    cypher: string,
    params: Record<string, unknown>,
    mapper: (record: Neo4jRecord) => T,
  ): Promise<T[]> {
    const session = this.provider.getDriver().session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r) => mapper(r as Neo4jRecord));
    } catch (error: unknown) {
      throw DATABASE_QUERY_ERROR((error as Error).message);
    } finally {
      await session.close();
    }
  }

  protected async readOne<T>(
    cypher: string,
    params: Record<string, unknown>,
    mapper: (record: Neo4jRecord) => T,
  ): Promise<T | null> {
    const results = await this.read(cypher, params, mapper);
    return results[0] ?? null;
  }

  protected async write(cypher: string, params: Record<string, unknown> = {}): Promise<void> {
    const session = this.provider.getDriver().session();
    try {
      await session.run(cypher, params);
    } catch (error: unknown) {
      throw DATABASE_QUERY_ERROR((error as Error).message);
    } finally {
      await session.close();
    }
  }

  protected async readPaginated(
    dataCypher: string,
    countCypher: string,
    params: Record<string, unknown>,
    pagination: PaginationVO,
    idKey = 'id',
  ): Promise<PaginatedIdsVO> {
    const safePage = pagination.page > 0 ? pagination.page : 1;
    const safeLimit = pagination.limit > 0 ? pagination.limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const driver = this.provider.getDriver();
    const dataSession = driver.session();
    const countSession = driver.session();

    try {
      const [dataResult, countResult] = await Promise.all([
        dataSession.run(dataCypher, {
          ...params,
          skip: neo4j.int(skip),
          limit: neo4j.int(safeLimit),
        }),
        countSession.run(countCypher, params),
      ]);

      const ids = dataResult.records.map((r) => r.get(idKey) as string);
      const total = toSafeInt(countResult.records[0]?.get('total'));
      const totalPages = Math.ceil(total / safeLimit);

      const paginationResponse = new PaginationResultVO(safePage, safeLimit, total, totalPages);

      return new PaginatedIdsVO(ids, paginationResponse);
    } catch (error: unknown) {
      throw DATABASE_QUERY_ERROR((error as Error).message);
    } finally {
      await Promise.all([dataSession.close(), countSession.close()]);
    }
  }
}
