import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SocialEdgeAction, SocialEdgeKind, SocialJobType } from '@volontariapp/messaging';
import { SocialEdgeIntentService } from '../../services/social-edge-intent.service.js';
import { createSocialEdgeRepositoryMock } from '../__test-utils__/mocks/social-edge.repository.mock.js';
import { createParticipationRepositoryMock } from '../__test-utils__/mocks/participation.repository.mock.js';
import {
  createTransactionalDataSourceMock,
  type TransactionalDataSourceMock,
} from '../__test-utils__/mocks/transactional-data-source.mock.js';
import {
  EventIdFactory,
  PostIdFactory,
  UserIdFactory,
} from '../__test-utils__/factories/ids.factory.js';

function expectCalledOnManager(
  fn: { mock: { calls: unknown[][] } },
  manager: unknown,
  rest: unknown[],
): void {
  const call = fn.mock.calls.at(-1);
  expect(call?.[0]).toBe(manager);
  expect(call?.slice(1)).toEqual(rest);
}

const USER = UserIdFactory.build('user-1');
const OTHER_USER = UserIdFactory.build('user-2');
const POST = PostIdFactory.build('post-1');
const EVENT = EventIdFactory.build('event-1');

describe('SocialEdgeIntentService (Unit)', () => {
  let service: SocialEdgeIntentService;
  let tx: TransactionalDataSourceMock;
  let edges: ReturnType<typeof createSocialEdgeRepositoryMock>;
  let participation: ReturnType<typeof createParticipationRepositoryMock>;

  beforeEach(() => {
    tx = createTransactionalDataSourceMock();
    edges = createSocialEdgeRepositoryMock();
    participation = createParticipationRepositoryMock();
    participation.eventExists.mockResolvedValue(true);
    service = new SocialEdgeIntentService(tx.dataSource, edges, participation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('likePost()', () => {
    it('should write the edge and the SOCIAL_EDGE_APPLY job in the same transaction', async () => {
      edges.insertIfAbsent.mockResolvedValue(true);

      await service.likePost(USER, POST);

      expect(jest.spyOn(tx.dataSource, 'transaction')).toHaveBeenCalledTimes(1);
      expectCalledOnManager(jest.spyOn(edges, 'insertIfAbsent'), tx.manager, [SocialEdgeKind.LIKE, 'user-1', 'post-1']);
      expect(jest.spyOn(tx.manager, 'getRepository')).toHaveBeenCalledTimes(1);
      expect(jest.spyOn(tx.jobsRepository, 'save')).toHaveBeenCalledTimes(1);
      expect(jest.spyOn(tx.jobsRepository, 'create')).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SocialJobType.SOCIAL_EDGE_APPLY,
          target: 'social-queue',
          emitter: 'ms-social',
          emitterId: 'user-1',
          scheduledAt: expect.any(Date),
          payload: expect.objectContaining({
            kind: SocialEdgeKind.LIKE,
            fromId: 'user-1',
            toId: 'post-1',
            action: SocialEdgeAction.ADD,
          }),
        }),
      );
    });

    it('should never touch Neo4j for a like', async () => {
      edges.insertIfAbsent.mockResolvedValue(true);

      await service.likePost(USER, POST);

      expect(jest.spyOn(participation, 'eventExists')).not.toHaveBeenCalled();
    });

    it('should throw ALREADY_EXISTS and enqueue no job when the edge exists', async () => {
      edges.insertIfAbsent.mockResolvedValue(false);

      await expect(service.likePost(USER, POST)).rejects.toMatchObject({ code: 'CONFLICT' });

      expect(jest.spyOn(tx.jobsRepository, 'save')).not.toHaveBeenCalled();
    });

    it('should enqueue no job and wrap the error when the Postgres insert fails', async () => {
      edges.insertIfAbsent.mockRejectedValue(new Error('connection lost'));

      await expect(service.likePost(USER, POST)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });

      expect(jest.spyOn(tx.jobsRepository, 'save')).not.toHaveBeenCalled();
    });

    it('should reject (rolling the transaction back) when the job write fails', async () => {
      edges.insertIfAbsent.mockResolvedValue(true);
      tx.jobsRepository.save.mockRejectedValue(new Error('jobs_outbox down'));

      await expect(service.likePost(USER, POST)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  describe('unlikePost()', () => {
    it('should delete the edge and enqueue a REMOVE job', async () => {
      edges.deleteIfPresent.mockResolvedValue(true);

      await service.unlikePost(USER, POST);

      expectCalledOnManager(jest.spyOn(edges, 'deleteIfPresent'), tx.manager, [SocialEdgeKind.LIKE, 'user-1', 'post-1']);
      expect(jest.spyOn(tx.jobsRepository, 'create')).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ action: SocialEdgeAction.REMOVE }),
        }),
      );
    });

    it('should throw NOT_FOUND and enqueue no job when the edge is absent', async () => {
      edges.deleteIfPresent.mockResolvedValue(false);

      await expect(service.unlikePost(USER, POST)).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(jest.spyOn(tx.jobsRepository, 'save')).not.toHaveBeenCalled();
    });
  });

  describe('followUser() / unfollowUser()', () => {
    it('should write a FOLLOW edge and job', async () => {
      edges.insertIfAbsent.mockResolvedValue(true);

      await service.followUser(USER, OTHER_USER);

      expectCalledOnManager(jest.spyOn(edges, 'insertIfAbsent'), tx.manager, [SocialEdgeKind.FOLLOW, 'user-1', 'user-2']);
      expect(jest.spyOn(tx.jobsRepository, 'save')).toHaveBeenCalledTimes(1);
    });

    it('should throw NOT_FOUND when unfollowing an absent edge', async () => {
      edges.deleteIfPresent.mockResolvedValue(false);

      await expect(service.unfollowUser(USER, OTHER_USER)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('wishEvent() / unwishEvent()', () => {
    it('should check the event node once, then write the WISH edge and job', async () => {
      edges.insertIfAbsent.mockResolvedValue(true);

      await service.wishEvent(USER, EVENT);

      expect(jest.spyOn(participation, 'eventExists')).toHaveBeenCalledTimes(1);
      expectCalledOnManager(jest.spyOn(edges, 'insertIfAbsent'), tx.manager, [SocialEdgeKind.WISH, 'user-1', 'event-1']);
    });

    it('should throw EVENT_NOT_FOUND before opening any transaction', async () => {
      participation.eventExists.mockResolvedValue(false);

      await expect(service.wishEvent(USER, EVENT)).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(jest.spyOn(tx.dataSource, 'transaction')).not.toHaveBeenCalled();
    });

    it('should throw WISH_NOT_FOUND when removing an absent wish', async () => {
      edges.deleteIfPresent.mockResolvedValue(false);

      await expect(service.unwishEvent(USER, EVENT)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('participateEvent() / leaveEvent()', () => {
    it('should drop the WISH row in the same transaction and tell the job to converge both', async () => {
      edges.insertIfAbsent.mockResolvedValue(true);
      edges.deleteIfPresent.mockResolvedValue(true);

      await service.participateEvent(USER, EVENT);

      expectCalledOnManager(jest.spyOn(edges, 'insertIfAbsent'), tx.manager, [SocialEdgeKind.PARTICIPATE, 'user-1', 'event-1']);
      expectCalledOnManager(jest.spyOn(edges, 'deleteIfPresent'), tx.manager, [SocialEdgeKind.WISH, 'user-1', 'event-1']);
      expect(jest.spyOn(tx.jobsRepository, 'create')).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            kind: SocialEdgeKind.PARTICIPATE,
            companionKind: SocialEdgeKind.WISH,
          }),
        }),
      );
    });

    it('should keep the WISH row when the participation already exists', async () => {
      edges.insertIfAbsent.mockResolvedValue(false);

      await expect(service.participateEvent(USER, EVENT)).rejects.toMatchObject({
        code: 'CONFLICT',
      });

      expect(jest.spyOn(edges, 'deleteIfPresent')).not.toHaveBeenCalled();
    });

    it('should not carry a companion kind when leaving', async () => {
      edges.deleteIfPresent.mockResolvedValue(true);

      await service.leaveEvent(USER, EVENT);

      expect(jest.spyOn(tx.jobsRepository, 'create')).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.not.objectContaining({ companionKind: expect.anything() }),
        }),
      );
    });
  });

  describe('mirrorEdge()', () => {
    it('should insert on ADD without any job', async () => {
      edges.insertIfAbsent.mockResolvedValue(false);

      await service.mirrorEdge(SocialEdgeKind.LIKE, 'user-1', 'post-1', SocialEdgeAction.ADD);

      expect(jest.spyOn(edges, 'insertIfAbsent')).toHaveBeenCalledTimes(1);
      expect(jest.spyOn(tx.jobsRepository, 'save')).not.toHaveBeenCalled();
    });

    it('should delete on REMOVE and ignore an absent row', async () => {
      edges.deleteIfPresent.mockResolvedValue(false);

      await service.mirrorEdge(SocialEdgeKind.LIKE, 'user-1', 'post-1', SocialEdgeAction.REMOVE);

      expect(jest.spyOn(edges, 'deleteIfPresent')).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteEdgesOfNode()', () => {
    it('should delegate to the repository and return the count', async () => {
      edges.deleteByNode.mockResolvedValue(3);

      await expect(service.deleteEdgesOfNode('post-1')).resolves.toBe(3);
      expectCalledOnManager(jest.spyOn(edges, 'deleteByNode'), tx.manager, ['post-1']);
    });
  });
});
