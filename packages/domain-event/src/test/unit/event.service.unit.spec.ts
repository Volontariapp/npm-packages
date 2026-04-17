import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { EventState } from '@volontariapp/contracts';
import { EventService } from '../../services/event.service.js';
import type { IEventRepository } from '../../repositories/interfaces/event.repository.js';
import { EventFactory } from '../__test-utils__/factories/event.factory.js';
import { TagFactory } from '../__test-utils__/factories/tag.factory.js';
import { createEventRepositoryMock } from '../__test-utils__/mocks/event.repository.mock.js';
import { createTagServiceMock } from '../__test-utils__/mocks/tag.service.mock.js';

describe('EventService (Unit)', () => {
  let service: EventService;
  let mockRepository: jest.Mocked<IEventRepository>;
  let mockTagService: ReturnType<typeof createTagServiceMock>;

  beforeEach(() => {
    mockRepository = createEventRepositoryMock();
    mockTagService = createTagServiceMock();
    service = new EventService(mockRepository, mockTagService);
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the event with relations when found', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1' });
      mockRepository.findById.mockResolvedValue(event);

      // Act
      const result = await service.findById('evt-1');

      // Assert
      expect(result).toEqual(event);
      expect(mockRepository.findById).toHaveBeenCalledWith('evt-1', ['requirements', 'tags']);
    });

    it('should throw EVENT_NOT_FOUND when the repository returns null', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findById('missing')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('missing'),
      });
    });

    it('should throw DATABASE_ERROR when the repository throws a generic error', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Connection lost'));

      // Act + Assert
      await expect(service.findById('evt-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });

    it('should rethrow a BaseError without wrapping it in DATABASE_ERROR', async () => {
      // Arrange — null triggers EVENT_NOT_FOUND (a BaseError), which must be re-thrown as-is
      mockRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findById('x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all events from the repository', async () => {
      // Arrange
      const events = EventFactory.buildMany(2);
      mockRepository.findAll.mockResolvedValue(events);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(events);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no events exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.findAll.mockRejectedValue(new Error('DB failure'));

      // Act + Assert
      await expect(service.findAll()).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should create and return the event without tags', async () => {
      // Arrange
      const input = EventFactory.buildInput();
      const created = EventFactory.build({ ...input });
      mockRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(mockTagService.findByIds).not.toHaveBeenCalled();
    });

    it('should create the event after validating existing tags', async () => {
      // Arrange
      const tag1 = TagFactory.build({ id: 'tag-1' });
      const tag2 = TagFactory.build({ id: 'tag-2' });
      const input = EventFactory.buildInput({ tags: [tag1, tag2] });
      const created = EventFactory.build({ ...input, tags: [tag1, tag2] });
      mockTagService.findByIds.mockResolvedValue([tag1, tag2]);
      mockRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result).toEqual(created);
      expect(mockTagService.findByIds).toHaveBeenCalledWith(['tag-1', 'tag-2']);
    });

    it('should throw INVALID_DATE_PARAMETERS when startAt >= endAt', async () => {
      // Arrange
      const now = new Date();
      const input = EventFactory.buildInput({ startAt: now, endAt: now });

      // Act + Assert
      await expect(service.create(input)).rejects.toMatchObject({
        code: 'INVALID_DATE_PARAMETER',
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw INVALID_DATE_PARAMETERS when startAt is after endAt', async () => {
      // Arrange
      const later = new Date();
      const earlier = new Date(later.getTime() - 1000);
      const input = EventFactory.buildInput({ startAt: later, endAt: earlier });

      // Act + Assert
      await expect(service.create(input)).rejects.toMatchObject({
        code: 'INVALID_DATE_PARAMETER',
      });
    });

    it('should throw TAG_NOT_FOUND when a tag id does not exist', async () => {
      // Arrange
      const tag = TagFactory.build({ id: 'tag-present' });
      const missingTag = TagFactory.build({ id: 'tag-missing' });
      const input = EventFactory.buildInput({ tags: [tag, missingTag] });
      // Only one tag found → missing tag triggers error
      mockTagService.findByIds.mockResolvedValue([tag]);

      // Act + Assert
      await expect(service.create(input)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('tag-missing'),
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw EVENT_ALREADY_EXISTS on unique constraint violation (code 23505)', async () => {
      // Arrange
      const input = EventFactory.buildInput({ name: 'Duplicate Event' });
      const dbError = { code: '23505', message: 'Unique violation' };
      mockRepository.create.mockRejectedValue(dbError);

      // Act + Assert
      await expect(service.create(input)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: expect.stringContaining('Duplicate Event'),
      });
    });

    it('should throw DATABASE_ERROR on generic repository failure', async () => {
      // Arrange
      const input = EventFactory.buildInput();
      mockRepository.create.mockRejectedValue(new Error('Insert failed'));

      // Act + Assert
      await expect(service.create(input)).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should find, update, and return the updated event', async () => {
      // Arrange
      const existing = EventFactory.build({ id: 'evt-1', name: 'Old Name' });
      const updated = EventFactory.build({ id: 'evt-1', name: 'New Name' });
      // Spy — findById is a public method called internally by update
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(updated);

      // Act
      const result = await service.update('evt-1', { name: 'New Name' });

      // Assert
      expect(result).toEqual(updated);
      expect(findByIdSpy).toHaveBeenCalledWith('evt-1');
    });

    it('should throw EVENT_NOT_FOUND when the event does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findById').mockRejectedValue({ code: 'NOT_FOUND', isBaseError: true });

      // Act + Assert
      await expect(service.update('missing', { name: 'X' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw INVALID_DATE_PARAMETERS when computed dates are invalid', async () => {
      // Arrange
      const now = new Date();
      const existing = EventFactory.build({
        id: 'evt-1',
        startAt: now,
        endAt: new Date(now.getTime() + 1000),
      });
      jest.spyOn(service, 'findById').mockResolvedValue(existing);
      // New endAt is before existing startAt
      const pastEnd = new Date(now.getTime() - 5000);

      // Act + Assert
      await expect(service.update('evt-1', { endAt: pastEnd })).rejects.toMatchObject({
        code: 'INVALID_DATE_PARAMETER',
      });
    });

    it('should throw TAG_NOT_FOUND when a tag does not exist during update', async () => {
      // Arrange
      const existing = EventFactory.build({ id: 'evt-1' });
      jest.spyOn(service, 'findById').mockResolvedValue(existing);
      const missingTag = TagFactory.build({ id: 'tag-missing' });
      mockTagService.findByIds.mockResolvedValue([]);

      // Act + Assert
      await expect(service.update('evt-1', { tags: [missingTag] })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw EVENT_NOT_FOUND when repository.update returns null', async () => {
      // Arrange
      const existing = EventFactory.build({ id: 'evt-1' });
      jest.spyOn(service, 'findById').mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update('evt-1', { name: 'X' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('should throw EVENT_ALREADY_EXISTS on unique constraint violation (code 23505)', async () => {
      // Arrange
      const existing = EventFactory.build({ id: 'evt-1' });
      jest.spyOn(service, 'findById').mockResolvedValue(existing);
      mockRepository.update.mockRejectedValue({ code: '23505', message: 'Unique violation' });

      // Act + Assert
      await expect(service.update('evt-1', { name: 'Dup' })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('should throw DATABASE_ERROR on a generic repository failure', async () => {
      // Arrange
      const existing = EventFactory.build({ id: 'evt-1' });
      jest.spyOn(service, 'findById').mockResolvedValue(existing);
      mockRepository.update.mockRejectedValue(new Error('Update crash'));

      // Act + Assert
      await expect(service.update('evt-1', {})).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── changeState ──────────────────────────────────────────────────────────

  describe('changeState()', () => {
    it('should return the event unchanged when the state is already the same', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1', state: EventState.EVENT_STATE_DRAFT });
      jest.spyOn(service, 'findById').mockResolvedValue(event);

      // Act
      const result = await service.changeState('evt-1', EventState.EVENT_STATE_DRAFT);

      // Assert — early return, no update triggered
      expect(result).toEqual(event);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw INVALID_EVENT_STATE_TRANSITION for CANCELLED → PUBLISHED', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1', state: EventState.EVENT_STATE_CANCELLED });
      jest.spyOn(service, 'findById').mockResolvedValue(event);

      // Act + Assert
      await expect(
        service.changeState('evt-1', EventState.EVENT_STATE_PUBLISHED),
      ).rejects.toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        message: expect.stringContaining('CANCELLED'),
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should update and return the event on a valid state transition', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1', state: EventState.EVENT_STATE_DRAFT });
      const publishedEvent = EventFactory.build({
        id: 'evt-1',
        state: EventState.EVENT_STATE_PUBLISHED,
      });
      jest.spyOn(service, 'findById').mockResolvedValue(event);
      mockRepository.update.mockResolvedValue(publishedEvent);

      // Act
      const result = await service.changeState('evt-1', EventState.EVENT_STATE_PUBLISHED);

      // Assert
      expect(result.state).toBe(EventState.EVENT_STATE_PUBLISHED);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({ state: EventState.EVENT_STATE_PUBLISHED }),
      );
    });

    it('should allow CANCELLED → DRAFT (not a blocked transition)', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1', state: EventState.EVENT_STATE_CANCELLED });
      const draftEvent = EventFactory.build({ id: 'evt-1', state: EventState.EVENT_STATE_DRAFT });
      jest.spyOn(service, 'findById').mockResolvedValue(event);
      mockRepository.update.mockResolvedValue(draftEvent);

      // Act
      const result = await service.changeState('evt-1', EventState.EVENT_STATE_DRAFT);

      // Assert
      expect(result.state).toBe(EventState.EVENT_STATE_DRAFT);
    });

    it('should throw EVENT_NOT_FOUND when the event does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findById').mockRejectedValue({ code: 'NOT_FOUND', isBaseError: true });

      // Act + Assert
      await expect(
        service.changeState('missing', EventState.EVENT_STATE_PUBLISHED),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should throw DATABASE_ERROR on a generic repository failure during update', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1', state: EventState.EVENT_STATE_DRAFT });
      jest.spyOn(service, 'findById').mockResolvedValue(event);
      mockRepository.update.mockRejectedValue(new Error('DB crash'));

      // Act + Assert
      await expect(
        service.changeState('evt-1', EventState.EVENT_STATE_PUBLISHED),
      ).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should find and delete the event successfully', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1' });
      const findByIdSpy = jest.spyOn(service, 'findById').mockResolvedValue(event);
      mockRepository.delete.mockResolvedValue(true);

      // Spy — ensuring delete is called with the correct id
      const deleteSpy = jest.spyOn(mockRepository, 'delete');

      // Act
      await service.delete('evt-1');

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('evt-1');
      expect(deleteSpy).toHaveBeenCalledWith('evt-1');
    });

    it('should throw EVENT_NOT_FOUND when the event does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findById').mockRejectedValue({ code: 'NOT_FOUND', isBaseError: true });

      // Act + Assert
      await expect(service.delete('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw DATABASE_ERROR when repository.delete throws', async () => {
      // Arrange
      const event = EventFactory.build({ id: 'evt-1' });
      jest.spyOn(service, 'findById').mockResolvedValue(event);
      mockRepository.delete.mockRejectedValue(new Error('Delete failed'));

      // Act + Assert
      await expect(service.delete('evt-1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  // ─── search ───────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('should return matching events for the search term', async () => {
      // Arrange
      const events = EventFactory.buildMany(2);
      mockRepository.search.mockResolvedValue(events);

      // Act
      const result = await service.search('cleanup');

      // Assert
      expect(result).toEqual(events);
      expect(mockRepository.search).toHaveBeenCalledWith('cleanup');
    });

    it('should return an empty array when no events match the term', async () => {
      // Arrange
      mockRepository.search.mockResolvedValue([]);

      // Act
      const result = await service.search('nonexistent');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should throw DATABASE_ERROR when the repository throws', async () => {
      // Arrange
      mockRepository.search.mockRejectedValue(new Error('Search failed'));

      // Act + Assert
      await expect(service.search('term')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });
});
