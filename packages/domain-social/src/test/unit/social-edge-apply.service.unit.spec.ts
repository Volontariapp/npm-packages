import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  PostEventMessagingType,
  SocialEdgeAction,
  SocialEdgeKind,
  SocialEventMessagingType,
} from '@volontariapp/messaging';
import {
  SocialEdgeApplyService,
  SocialEdgeNodeMissingError,
} from '../../services/social-edge-apply.service.js';
import { buildSocialEdgeEventId } from '../../helpers/social-edge-event-id.js';
import {
  createSocialEdgeGraphRepositoryMock,
  createSocialEdgeRepositoryMock,
} from '../__test-utils__/mocks/social-edge.repository.mock.js';
import { createTransactionalDataSourceMock } from '../__test-utils__/mocks/transactional-data-source.mock.js';
import { createInsertOrIgnoreMock } from '../__test-utils__/mocks/insert-or-ignore.mock.js';
import { SocialEdgePayloadFactory } from '../__test-utils__/factories/social-edge.factory.js';

const JOB_ID = '11111111-1111-4111-8111-111111111111';

describe('SocialEdgeApplyService (Unit)', () => {
  let service: SocialEdgeApplyService;
  let edges: ReturnType<typeof createSocialEdgeRepositoryMock>;
  let graph: ReturnType<typeof createSocialEdgeGraphRepositoryMock>;
  let inserts: ReturnType<typeof createInsertOrIgnoreMock>;
  let tx: ReturnType<typeof createTransactionalDataSourceMock>;

  beforeEach(() => {
    tx = createTransactionalDataSourceMock();
    edges = createSocialEdgeRepositoryMock();
    graph = createSocialEdgeGraphRepositoryMock();
    inserts = createInsertOrIgnoreMock();
    service = new SocialEdgeApplyService(tx.dataSource, edges, graph, inserts.source);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should converge Neo4j to the present state read from Postgres, not to the job action', async () => {
    const payload = SocialEdgePayloadFactory.build({ action: SocialEdgeAction.ADD });
    edges.exists.mockResolvedValue(false);
    graph.converge.mockResolvedValue([{ kind: SocialEdgeKind.LIKE, present: false, affected: 1 }]);

    await service.apply(payload, { jobId: JOB_ID });

    expect(jest.spyOn(graph, 'converge')).toHaveBeenCalledWith(payload.fromId, payload.toId, [
      { kind: SocialEdgeKind.LIKE, present: false },
    ]);
  });

  it('should converge present state with a single graph call', async () => {
    const payload = SocialEdgePayloadFactory.build();
    edges.exists.mockResolvedValue(true);
    graph.converge.mockResolvedValue([{ kind: SocialEdgeKind.LIKE, present: true, affected: 1 }]);

    await service.apply(payload, { jobId: JOB_ID });

    expect(jest.spyOn(graph, 'converge')).toHaveBeenCalledTimes(1);
    const call = edges.exists.mock.calls[0];
    expect(call[0]).toBe(tx.manager);
    expect(call.slice(1)).toEqual([SocialEdgeKind.LIKE, payload.fromId, payload.toId]);
  });

  it('should converge the companion kind in the same graph call', async () => {
    const payload = SocialEdgePayloadFactory.build({
      kind: SocialEdgeKind.PARTICIPATE,
      companionKind: SocialEdgeKind.WISH,
    });
    edges.exists.mockImplementation((_manager, kind) =>
      Promise.resolve(kind === SocialEdgeKind.PARTICIPATE),
    );
    graph.converge.mockResolvedValue([
      { kind: SocialEdgeKind.PARTICIPATE, present: true, affected: 1 },
      { kind: SocialEdgeKind.WISH, present: false, affected: 1 },
    ]);

    await service.apply(payload, { jobId: JOB_ID });

    expect(jest.spyOn(graph, 'converge')).toHaveBeenCalledWith(payload.fromId, payload.toId, [
      { kind: SocialEdgeKind.PARTICIPATE, present: true },
      { kind: SocialEdgeKind.WISH, present: false },
    ]);
  });

  it('should throw a retryable error and emit nothing when a node is not in the graph yet', async () => {
    const payload = SocialEdgePayloadFactory.build();
    edges.exists.mockResolvedValue(true);
    graph.converge.mockResolvedValue([{ kind: SocialEdgeKind.LIKE, present: true, affected: 0 }]);

    await expect(service.apply(payload, { jobId: JOB_ID })).rejects.toBeInstanceOf(
      SocialEdgeNodeMissingError,
    );

    expect(jest.spyOn(inserts, 'insert')).not.toHaveBeenCalled();
  });

  it('should not fail when the edge is absent and there is nothing to delete', async () => {
    const payload = SocialEdgePayloadFactory.build({ action: SocialEdgeAction.REMOVE });
    edges.exists.mockResolvedValue(false);
    graph.converge.mockResolvedValue([{ kind: SocialEdgeKind.LIKE, present: false, affected: 0 }]);

    await expect(service.apply(payload, { jobId: JOB_ID })).resolves.toBeDefined();
  });

  it('should write POST_LIKED after Neo4j with a deterministic id', async () => {
    const payload = SocialEdgePayloadFactory.build({ fromId: 'user-1', toId: 'post-1' });
    edges.exists.mockResolvedValue(true);
    const order: string[] = [];
    graph.converge.mockImplementation(() => {
      order.push('neo4j');
      return Promise.resolve([{ kind: SocialEdgeKind.LIKE, present: true, affected: 1 }]);
    });
    inserts.builder.execute.mockImplementation(() => {
      order.push('event');
      return Promise.resolve({});
    });

    const result = await service.apply(payload, { jobId: JOB_ID });

    expect(order).toEqual(['neo4j', 'event']);
    const expectedId = buildSocialEdgeEventId(JOB_ID, PostEventMessagingType.POST_LIKED);
    expect(result.eventId).toBe(expectedId);
    expect(jest.spyOn(inserts.builder, 'orIgnore')).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(inserts.builder, 'values')).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expectedId,
        type: PostEventMessagingType.POST_LIKED,
        emitter: 'ms-social',
        emitterId: 'user-1',
        targetServices: ['post-liked'],
        payload: { after: { postId: 'post-1', authorId: 'user-1' } },
      }),
    );
  });

  it('should produce the same event id when the same job is applied twice', async () => {
    const payload = SocialEdgePayloadFactory.build();
    edges.exists.mockResolvedValue(true);
    graph.converge.mockResolvedValue([{ kind: SocialEdgeKind.LIKE, present: true, affected: 1 }]);

    const first = await service.apply(payload, { jobId: JOB_ID });
    const second = await service.apply(payload, { jobId: JOB_ID });

    expect(second.eventId).toBe(first.eventId);
    expect(jest.spyOn(graph, 'converge')).toHaveBeenCalledTimes(2);
  });

  it('should produce distinct event ids for two jobs on the same edge', async () => {
    const payload = SocialEdgePayloadFactory.build();
    edges.exists.mockResolvedValue(true);
    graph.converge.mockResolvedValue([{ kind: SocialEdgeKind.LIKE, present: true, affected: 1 }]);

    const first = await service.apply(payload, { jobId: JOB_ID });
    const second = await service.apply(payload, { jobId: '22222222-2222-4222-8222-222222222222' });

    expect(second.eventId).not.toBe(first.eventId);
  });

  it('should emit POST_UNLIKED on a REMOVE like and EVENT_SOCIAL_WISHED on a WISH', async () => {
    edges.exists.mockResolvedValue(false);
    graph.converge.mockImplementation((_from, _to, states) =>
      Promise.resolve(states.map((s) => ({ ...s, affected: 1 }))),
    );

    const unlike = await service.apply(
      SocialEdgePayloadFactory.build({ action: SocialEdgeAction.REMOVE }),
      { jobId: JOB_ID },
    );
    const wish = await service.apply(
      SocialEdgePayloadFactory.build({ kind: SocialEdgeKind.WISH }),
      { jobId: JOB_ID },
    );

    expect(unlike.eventId).toBe(buildSocialEdgeEventId(JOB_ID, PostEventMessagingType.POST_UNLIKED));
    expect(wish.eventId).toBe(
      buildSocialEdgeEventId(JOB_ID, SocialEventMessagingType.EVENT_SOCIAL_WISHED),
    );
  });

  it('should emit no business event for FOLLOW and PARTICIPATE', async () => {
    edges.exists.mockResolvedValue(true);
    graph.converge.mockImplementation((_from, _to, states) =>
      Promise.resolve(states.map((s) => ({ ...s, affected: 1 }))),
    );

    const follow = await service.apply(
      SocialEdgePayloadFactory.build({ kind: SocialEdgeKind.FOLLOW }),
      { jobId: JOB_ID },
    );
    const participate = await service.apply(
      SocialEdgePayloadFactory.build({ kind: SocialEdgeKind.PARTICIPATE }),
      { jobId: JOB_ID },
    );

    expect(follow).toEqual({});
    expect(participate).toEqual({});
    expect(jest.spyOn(inserts, 'insert')).not.toHaveBeenCalled();
  });

  it('should reject and write no event when Neo4j fails (the job is retried)', async () => {
    edges.exists.mockResolvedValue(true);
    graph.converge.mockRejectedValue(new Error('neo4j cold'));

    await expect(
      service.apply(SocialEdgePayloadFactory.build(), { jobId: JOB_ID }),
    ).rejects.toThrow('neo4j cold');

    expect(jest.spyOn(inserts, 'insert')).not.toHaveBeenCalled();
  });
});
