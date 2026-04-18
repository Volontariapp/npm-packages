import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ParticipationService } from '../../services/participation.service.js';
import type { IParticipationRepository } from '../../repositories/interfaces/participation.repository.js';
import { createParticipationRepositoryMock } from '../__test-utils__/mocks/participation.repository.mock.js';
import { PaginatedIdsFactory } from '../__test-utils__/factories/paginated-ids.factory.js';

const PAGINATION = { page: 1, limit: 10 };

describe('ParticipationService (Unit)', () => {
  let service: ParticipationService;
  let mockRepository: jest.Mocked<IParticipationRepository>;

  beforeEach(() => {
    mockRepository = createParticipationRepositoryMock();
    service = new ParticipationService(mockRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── createEvent ──────────────────────────────────────────────────────────

  describe('createEvent()', () => {
    it('should call repository.createEventNode with the eventId if not exists', async () => {
      const eventExistsSpy = jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);
      const createEventNodeSpy = jest
        .spyOn(mockRepository, 'createEventNode')
        .mockResolvedValue(undefined);

      await service.createEvent('event-1');

      expect(eventExistsSpy).toHaveBeenCalledWith('event-1');
      expect(createEventNodeSpy).toHaveBeenCalledWith('event-1');
    });

    it('should throw SOCIAL_EVENT_ALREADY_EXISTS if event already exists', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);

      await expect(service.createEvent('event-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);
      jest.spyOn(mockRepository, 'createEventNode').mockRejectedValue(new Error('Write failed'));

      await expect(service.createEvent('event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });

    it('should rethrow a BaseError without wrapping', async () => {
      jest.spyOn(mockRepository, 'createEventNode').mockRejectedValue({
        code: 'DATABASE_QUERY_ERROR',
        isBaseError: true,
      });

      await expect(service.createEvent('event-1')).rejects.toMatchObject({ isBaseError: true });
    });
  });

  // ─── deleteEvent ──────────────────────────────────────────────────────────

  describe('deleteEvent()', () => {
    it('should call repository.deleteEventNode with the eventId if it exists', async () => {
      const eventExistsSpy = jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      const deleteEventNodeSpy = jest
        .spyOn(mockRepository, 'deleteEventNode')
        .mockResolvedValue(undefined);

      await service.deleteEvent('event-1');

      expect(eventExistsSpy).toHaveBeenCalledWith('event-1');
      expect(deleteEventNodeSpy).toHaveBeenCalledWith('event-1');
    });

    it('should throw SOCIAL_EVENT_NOT_FOUND if event does not exist', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);

      await expect(service.deleteEvent('event-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteEventNode').mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteEvent('event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getEventExists ───────────────────────────────────────────────────────

  describe('getEventExists()', () => {
    it('should return true when the event node exists', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);

      const result = await service.getEventExists('event-1');

      expect(result).toBe(true);
    });

    it('should return false when the event node does not exist', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);

      const result = await service.getEventExists('event-missing');

      expect(result).toBe(false);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockRejectedValue(new Error('Query failed'));

      await expect(service.getEventExists('event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── setEventCreator ──────────────────────────────────────────────────────

  describe('setEventCreator()', () => {
    it('should call repository.createUserEvent with correct args if event exists', async () => {
      const eventExistsSpy = jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      const createUserEventSpy = jest
        .spyOn(mockRepository, 'createUserEvent')
        .mockResolvedValue(undefined);

      await service.setEventCreator('user-1', 'event-1');

      expect(eventExistsSpy).toHaveBeenCalledWith('event-1');
      expect(createUserEventSpy).toHaveBeenCalledWith('user-1', 'event-1');
    });

    it('should throw SOCIAL_EVENT_NOT_FOUND if event does not exist', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);

      await expect(service.setEventCreator('user-1', 'event-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'createUserEvent').mockRejectedValue(new Error('Merge failed'));

      await expect(service.setEventCreator('user-1', 'event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── removeEventCreator ───────────────────────────────────────────────────

  describe('removeEventCreator()', () => {
    it('should call repository.deleteUserEvent with correct args if event exists', async () => {
      const eventExistsSpy = jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      const deleteUserEventSpy = jest
        .spyOn(mockRepository, 'deleteUserEvent')
        .mockResolvedValue(undefined);

      await service.removeEventCreator('user-1', 'event-1');

      expect(eventExistsSpy).toHaveBeenCalledWith('event-1');
      expect(deleteUserEventSpy).toHaveBeenCalledWith('user-1', 'event-1');
    });

    it('should throw SOCIAL_EVENT_NOT_FOUND if event does not exist', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);

      await expect(service.removeEventCreator('user-1', 'event-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'deleteUserEvent').mockRejectedValue(new Error('Delete failed'));

      await expect(service.removeEventCreator('user-1', 'event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── participateEvent ─────────────────────────────────────────────────────

  describe('participateEvent()', () => {
    it('should call repository.createParticipation if event exists and not participating', async () => {
      const eventExistsSpy = jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      const participationExistsSpy = jest
        .spyOn(mockRepository, 'participationExists')
        .mockResolvedValue(false);
      const createParticipationSpy = jest
        .spyOn(mockRepository, 'createParticipation')
        .mockResolvedValue(undefined);

      await service.participateEvent('user-1', 'event-1');

      expect(eventExistsSpy).toHaveBeenCalledWith('event-1');
      expect(participationExistsSpy).toHaveBeenCalledWith('user-1', 'event-1');
      expect(createParticipationSpy).toHaveBeenCalledWith('user-1', 'event-1');
    });

    it('should throw SOCIAL_EVENT_NOT_FOUND if event does not exist', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);

      await expect(service.participateEvent('user-1', 'event-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw SOCIAL_PARTICIPATION_ALREADY_EXISTS if already participating', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'participationExists').mockResolvedValue(true);

      await expect(service.participateEvent('user-1', 'event-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'participationExists').mockResolvedValue(false);
      jest
        .spyOn(mockRepository, 'createParticipation')
        .mockRejectedValue(new Error('Merge failed'));

      await expect(service.participateEvent('user-1', 'event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── leaveEvent ───────────────────────────────────────────────────────────

  describe('leaveEvent()', () => {
    it('should call repository.deleteParticipation with correct args if exists', async () => {
      const eventExistsSpy = jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      const participationExistsSpy = jest
        .spyOn(mockRepository, 'participationExists')
        .mockResolvedValue(true);
      const deleteParticipationSpy = jest
        .spyOn(mockRepository, 'deleteParticipation')
        .mockResolvedValue(undefined);

      await service.leaveEvent('user-1', 'event-1');

      expect(eventExistsSpy).toHaveBeenCalledWith('event-1');
      expect(participationExistsSpy).toHaveBeenCalledWith('user-1', 'event-1');
      expect(deleteParticipationSpy).toHaveBeenCalledWith('user-1', 'event-1');
    });

    it('should throw SOCIAL_EVENT_NOT_FOUND if event does not exist', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(false);

      await expect(service.leaveEvent('user-1', 'event-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw SOCIAL_PARTICIPATION_NOT_FOUND if not participating', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'participationExists').mockResolvedValue(false);

      await expect(service.leaveEvent('user-1', 'event-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'eventExists').mockResolvedValue(true);
      jest.spyOn(mockRepository, 'participationExists').mockResolvedValue(true);
      jest
        .spyOn(mockRepository, 'deleteParticipation')
        .mockRejectedValue(new Error('Delete failed'));

      await expect(service.leaveEvent('user-1', 'event-1')).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getUserEvents ────────────────────────────────────────────────────────

  describe('getUserEvents()', () => {
    it('should return paginated event ids created by the user', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(2);
      const getUserEventsSpy = jest
        .spyOn(mockRepository, 'getUserEvents')
        .mockResolvedValue(expected);

      const result = await service.getUserEvents('user-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(getUserEventsSpy).toHaveBeenCalledWith('user-1', PAGINATION);
    });

    it('should return empty result when user created no events', async () => {
      jest
        .spyOn(mockRepository, 'getUserEvents')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getUserEvents('user-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest.spyOn(mockRepository, 'getUserEvents').mockRejectedValue(new Error('Query failed'));

      await expect(service.getUserEvents('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getUserParticipations ────────────────────────────────────────────────

  describe('getUserParticipations()', () => {
    it('should return paginated event ids the user participates in', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(3);
      jest.spyOn(mockRepository, 'getUserParticipations').mockResolvedValue(expected);

      const result = await service.getUserParticipations('user-1', PAGINATION);

      expect(result).toEqual(expected);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest
        .spyOn(mockRepository, 'getUserParticipations')
        .mockRejectedValue(new Error('Query failed'));

      await expect(service.getUserParticipations('user-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  // ─── getEventParticipants ─────────────────────────────────────────────────

  describe('getEventParticipants()', () => {
    it('should return paginated participant user ids for an event', async () => {
      const expected = PaginatedIdsFactory.buildWithRandomIds(5);
      const getEventParticipantsSpy = jest
        .spyOn(mockRepository, 'getEventParticipants')
        .mockResolvedValue(expected);

      const result = await service.getEventParticipants('event-1', PAGINATION);

      expect(result).toEqual(expected);
      expect(getEventParticipantsSpy).toHaveBeenCalledWith('event-1', PAGINATION);
    });

    it('should return empty result when event has no participants', async () => {
      jest
        .spyOn(mockRepository, 'getEventParticipants')
        .mockResolvedValue(PaginatedIdsFactory.buildEmpty());

      const result = await service.getEventParticipants('event-1', PAGINATION);

      expect(result.ids).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      jest
        .spyOn(mockRepository, 'getEventParticipants')
        .mockRejectedValue(new Error('Query failed'));

      await expect(service.getEventParticipants('event-1', PAGINATION)).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });
});
