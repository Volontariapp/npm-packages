import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { EntityManager } from '@volontariapp/database';
import { createMock } from '@volontariapp/testing';
import { SocialEdgeKind } from '@volontariapp/messaging';
import { PostgresSocialEdgeRepository } from '../../repositories/postgres-social-edge.repository.js';

describe('PostgresSocialEdgeRepository (Unit)', () => {
  let repository: PostgresSocialEdgeRepository;
  let manager: ReturnType<typeof createMock<EntityManager>>;

  beforeEach(() => {
    repository = new PostgresSocialEdgeRepository();
    manager = createMock<EntityManager>();
  });

  it('should report an insert when the row was created', async () => {
    manager.query.mockResolvedValue([{ n: 1 }]);

    await expect(
      repository.insertIfAbsent(manager, SocialEdgeKind.LIKE, 'u1', 'p1'),
    ).resolves.toBe(true);

    expect(jest.spyOn(manager, 'query')).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT DO NOTHING'), [
      'LIKE',
      'u1',
      'p1',
    ]);
  });

  it('should report no insert when the row already existed (count 0)', async () => {
    manager.query.mockResolvedValue([{ n: 0 }]);

    await expect(
      repository.insertIfAbsent(manager, SocialEdgeKind.LIKE, 'u1', 'p1'),
    ).resolves.toBe(false);
  });

  it('should read the count whatever the driver type (string or number)', async () => {
    manager.query.mockResolvedValue([{ n: '1' }]);

    await expect(
      repository.deleteIfPresent(manager, SocialEdgeKind.FOLLOW, 'u1', 'u2'),
    ).resolves.toBe(true);
  });

  it('should report no delete on an empty result', async () => {
    manager.query.mockResolvedValue([]);

    await expect(
      repository.deleteIfPresent(manager, SocialEdgeKind.FOLLOW, 'u1', 'u2'),
    ).resolves.toBe(false);
  });

  it('should check existence on the (kind, from, to) key', async () => {
    manager.query.mockResolvedValue([{ n: 1 }]);

    await expect(repository.exists(manager, SocialEdgeKind.WISH, 'u1', 'e1')).resolves.toBe(true);

    expect(jest.spyOn(manager, 'query')).toHaveBeenCalledWith(expect.stringContaining('kind = $1'), [
      'WISH',
      'u1',
      'e1',
    ]);
  });

  it('should delete every row of a node, as source or target, and return the count', async () => {
    manager.query.mockResolvedValue([{ n: 4 }]);

    await expect(repository.deleteByNode(manager, 'post-1')).resolves.toBe(4);
  });
});
