import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Neo4jBaseRepository } from '../../repositories/base/neo4j-base.repository.js';
import type { NestNeo4jProvider } from '@volontariapp/bridge-nest';
import type { Driver, Session } from 'neo4j-driver';

class TestRepository extends Neo4jBaseRepository {
  async testRead(cypher: string, params: Record<string, unknown> = {}) {
    return this.read(cypher, params, (r) => r.get('id'));
  }

  async testWrite(cypher: string, params: Record<string, unknown> = {}) {
    return this.write(cypher, params);
  }

  async testReadPaginated(cypher: string, count: string, params: Record<string, unknown> = {}) {
    return this.readPaginated(cypher, count, params, { page: 1, limit: 10 });
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
      mockSession.run.mockRejectedValue(new Error(errorMsg));

      await expect(repository.testRead('MATCH (n) RETURN n')).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(errorMsg),
      });

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  // ─── write ─────────────────────────────────────────────────────────────────

  describe('write()', () => {
    it('should throw DATABASE_QUERY_ERROR when the driver fails', async () => {
      const errorMsg = 'Constraint violation';
      mockSession.run.mockRejectedValue(new Error(errorMsg));

      await expect(repository.testWrite('CREATE (n:User { id: "1" })')).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(errorMsg),
      });

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  // ─── readPaginated ─────────────────────────────────────────────────────────

  describe('readPaginated()', () => {
    it('should throw DATABASE_QUERY_ERROR when the driver fails on data query', async () => {
      const errorMsg = 'Pagination query failed';
      mockSession.run.mockRejectedValue(new Error(errorMsg));

      await expect(
        repository.testReadPaginated('MATCH (n) RETURN n', 'MATCH (n) RETURN count(n)'),
      ).rejects.toMatchObject({
        code: 'DATABASE_QUERY_ERROR',
        message: expect.stringContaining(errorMsg),
      });

      // Close is called once per session (data and count)
      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});
