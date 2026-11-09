import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import type { DataSource, ObjectLiteral } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { PostgresEventRepository } from '../../repositories/postgres-event.repository.js';
import { EventModel } from '../../models/event.model.js';
import { SearchAdvancedVO } from '../../value-objects/search-advanced.value-object.js';
import { createSqlOnlyDataSource } from '../__test-utils__/sql-only-data-source.js';

interface CapturedQuery {
  kind: 'page' | 'count';
  sql: string;
  parameters: unknown[];
}

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ORGANIZER_A = '33333333-3333-4333-8333-333333333333';
const ORGANIZER_B = '44444444-4444-4444-8444-444444444444';

interface SearchParamsOverrides {
  ids?: string[];
  excludedIds?: string[];
  excludedOrganizerIds?: string[];
  tagSlugs?: string[];
  page?: number;
  limit?: number;
}

const buildParams = (overrides: SearchParamsOverrides = {}): SearchAdvancedVO =>
  new SearchAdvancedVO(
    undefined,
    undefined,
    overrides.tagSlugs,
    undefined,
    undefined,
    undefined,
    overrides.ids,
    overrides.excludedIds,
    undefined,
    undefined,
    undefined,
    overrides.page ?? 1,
    overrides.limit ?? 10,
    overrides.excludedOrganizerIds,
  );

describe('PostgresEventRepository.searchAdvanced (SQL)', () => {
  let dataSource: DataSource;
  let repository: PostgresEventRepository;
  let captured: CapturedQuery[];
  let pageRows: EventModel[];
  let countRow: { total: string } | undefined;

  beforeAll(async () => {
    dataSource = await createSqlOnlyDataSource();
  });

  beforeEach(() => {
    captured = [];
    pageRows = [];
    countRow = { total: '0' };
    repository = new PostgresEventRepository(dataSource.getRepository(EventModel));

    jest
      .spyOn(SelectQueryBuilder.prototype, 'getMany')
      .mockImplementation(function (this: SelectQueryBuilder<ObjectLiteral>) {
        const [sql, parameters] = this.getQueryAndParameters();
        captured.push({ kind: 'page', sql, parameters });
        return Promise.resolve(pageRows);
      });
    jest
      .spyOn(SelectQueryBuilder.prototype, 'getRawOne')
      .mockImplementation(function (this: SelectQueryBuilder<ObjectLiteral>) {
        const [sql, parameters] = this.getQueryAndParameters();
        captured.push({ kind: 'count', sql, parameters });
        return Promise.resolve(countRow);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const queryOf = (kind: CapturedQuery['kind']): CapturedQuery => {
    const query = captured.find((entry) => entry.kind === kind);
    if (!query) throw new Error(`no ${kind} query was run`);
    return query;
  };

  describe('knownTotal', () => {
    it('runs only the page query and returns the known total', async () => {
      const result = await repository.searchAdvanced(buildParams({ page: 2 }), {
        knownTotal: 42,
      });

      expect(captured.map((entry) => entry.kind)).toEqual(['page']);
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('accepts a known total of zero', async () => {
      const result = await repository.searchAdvanced(buildParams(), { knownTotal: 0 });

      expect(captured.map((entry) => entry.kind)).toEqual(['page']);
      expect(result.total).toBe(0);
    });

    it('counts when no total is known', async () => {
      // An empty page but 25 events in all: the total can only come from the count
      countRow = { total: '25' };

      const result = await repository.searchAdvanced(buildParams({ page: 3 }));

      expect(captured.map((entry) => entry.kind).sort()).toEqual(['count', 'page']);
      expect(result.events).toEqual([]);
      expect(result.total).toBe(25);
      expect(result.page).toBe(3);
    });

    it('returns zero when the count returns no row', async () => {
      countRow = undefined;

      const result = await repository.searchAdvanced(buildParams());

      expect(result.total).toBe(0);
    });
  });

  describe('count query', () => {
    it('applies the same filters as the page, without order, offset or limit', async () => {
      await repository.searchAdvanced(
        buildParams({ excludedIds: [ID_A], excludedOrganizerIds: [ORGANIZER_A], page: 2 }),
      );

      const page = queryOf('page');
      const count = queryOf('count');
      const whereOf = (sql: string): string => sql.slice(sql.indexOf('WHERE'));

      expect(count.sql).toContain('COUNT(*)');
      expect(count.sql).not.toContain('ORDER BY');
      expect(count.sql).not.toContain('LIMIT');
      expect(count.sql).not.toContain('OFFSET');
      expect(whereOf(page.sql).startsWith(whereOf(count.sql).split(' ORDER BY')[0])).toBe(true);
      expect(count.parameters).toEqual([[ID_A], [ORGANIZER_A]]);
    });

    it('counts distinct events when the tag join can repeat a row', async () => {
      await repository.searchAdvanced(buildParams({ tagSlugs: ['nature'] }));

      const count = queryOf('count');
      expect(count.sql).toContain('COUNT(DISTINCT "event"."id")');
      expect(count.sql).toContain('LEFT JOIN');
    });
  });

  describe('id lists', () => {
    it('binds each list as a single uuid[] parameter', async () => {
      const ids = [ID_A, ID_B];
      const excludedIds = [ID_B, ID_A];
      const excludedOrganizerIds = [ORGANIZER_A, ORGANIZER_B];

      await repository.searchAdvanced(buildParams({ ids, excludedIds, excludedOrganizerIds }), {
        knownTotal: 1,
      });

      const page = queryOf('page');
      expect(page.sql).toContain('"event"."id" = ANY(CAST($1 AS uuid[]))');
      expect(page.sql).toContain('"event"."id" <> ALL(CAST($2 AS uuid[]))');
      expect(page.sql).toContain('"event"."organizerId" <> ALL(CAST($3 AS uuid[]))');
      expect(page.sql).not.toMatch(/\bNOT IN\b/);
      expect(page.parameters.slice(0, 3)).toEqual([ids, excludedIds, excludedOrganizerIds]);
    });

    it('skips empty lists', async () => {
      await repository.searchAdvanced(
        buildParams({ ids: [], excludedIds: [], excludedOrganizerIds: [] }),
        { knownTotal: 0 },
      );

      const page = queryOf('page');
      expect(page.sql).not.toContain('ANY(');
      expect(page.sql).not.toContain('ALL(');
      expect(page.parameters).toEqual([]);
    });
  });
});
