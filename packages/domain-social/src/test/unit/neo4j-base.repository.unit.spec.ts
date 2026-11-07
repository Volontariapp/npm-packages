import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Neo4jBaseRepository } from '../../repositories/base/neo4j-base.repository.js';
import type { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { Driver, Session } from 'neo4j-driver';
import { PaginationFactory } from '../__test-utils__/factories/pagination.factory.js';

class TestRepository extends Neo4jBaseRepository {
  async testRead(cypher: string, params: Record<string, unknown> = {}) {
    return this.read(cypher, params, (r) => r.get('id'));
  }

  async testWrite(cypher: string, params: Record<string, unknown> = {}) {
    return this.write(cypher, params);
  }

  async testReadPaginated(cypher: string, count: string, params: Record<string, unknown> = {}) {
    return this.readPaginated(cypher, count, params, PaginationFactory.build());
  }
}

describe('Neo4jBaseRepository (Unit)', () => {
  let repository: TestRepository;
  let mockProvider: jest.Mocked<NestNeo4jProvider>;
  let mockDriver: jest.Mocked<Driver>;
  let mockSession: jest.Mocked<Session>;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      executeWrite: jest.fn((work: (tx: { run: Session['run'] }) => Promise<unknown>) =>
        work({ run: (...args: Parameters<Session['run']>) => mockSession.run(...args) }),
      ),
      close: jest.fn<() => Promise<void>>().mockImplementation(() => Promise.resolve()),
    } as unknown as jest.Mocked<Session>;

    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    } as unknown as jest.Mocked<Driver>;

    mockProvider = {
      getDriver: jest.fn().mockReturnValue(mockDriver),
    } as unknown as jest.Mocked<NestNeo4jProvider>;

    repository = new TestRepository(mockProvider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── read ──────────────────────────────────────────────────────────────────

  describe('read()', () => {
    it('should throw DATABASE_QUERY_ERROR when the driver fails', async () => {
      const errorMsg = 'Cypher syntax error';
      jest.spyOn(mockSession, 'run').mockRejectedValue(new Error(errorMsg));
      const closeSpy = jest.spyOn(mockSession, 'close');

      await expect(repository.testRead('MATCH (n) RETURN n')).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(errorMsg),
      });

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  // ─── write ─────────────────────────────────────────────────────────────────

  describe('write()', () => {
    it('should run the cypher in a managed write transaction so transient errors are retried', async () => {
      const runSpy = jest.spyOn(mockSession, 'run').mockResolvedValue({ records: [] } as never);
      const executeWriteSpy = jest.spyOn(mockSession, 'executeWrite');

      await repository.testWrite('MERGE (n:User { id: $id })', { id: '1' });

      expect(executeWriteSpy).toHaveBeenCalledTimes(1);
      expect(runSpy).toHaveBeenCalledWith('MERGE (n:User { id: $id })', { id: '1' });
    });

    it('should surface the error as DATABASE_QUERY_ERROR once the driver gave up retrying', async () => {
      const deadlock = 'ForsetiClient[transactionId=1] can not acquire ExclusiveLock';
      jest.spyOn(mockSession, 'executeWrite').mockRejectedValue(new Error(deadlock));
      const closeSpy = jest.spyOn(mockSession, 'close');

      await expect(repository.testWrite('MERGE (n:User)')).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(deadlock),
      });

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should throw DATABASE_QUERY_ERROR when the driver fails', async () => {
      const errorMsg = 'Constraint violation';
      jest.spyOn(mockSession, 'run').mockRejectedValue(new Error(errorMsg));
      const closeSpy = jest.spyOn(mockSession, 'close');

      await expect(repository.testWrite('CREATE (n:User { id: "1" })')).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(errorMsg),
      });

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  // ─── readPaginated ─────────────────────────────────────────────────────────

  describe('readPaginated()', () => {
    it('should throw DATABASE_QUERY_ERROR when the driver fails on data query', async () => {
      const errorMsg = 'PaginationVO query failed';
      jest.spyOn(mockSession, 'run').mockRejectedValue(new Error(errorMsg));
      const closeSpy = jest.spyOn(mockSession, 'close');

      await expect(
        repository.testReadPaginated('MATCH (n) RETURN n', 'MATCH (n) RETURN count(n)'),
      ).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(errorMsg),
      });

      // Close is called once per session (data and count)
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
