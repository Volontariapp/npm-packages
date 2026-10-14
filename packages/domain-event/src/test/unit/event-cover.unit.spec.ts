import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventService } from '../../services/event.service.js';
import { createEventRepositoryMock } from '../__test-utils__/mocks/event.repository.mock.js';
import { createTagServiceMock } from '../__test-utils__/mocks/tag.service.mock.js';
import { EventEntity } from '../../entities/event.entity.js';
import { CoverStatus } from '@volontariapp/contracts';
import { EVENT_NOT_FOUND, EVENT_ALREADY_EXISTS } from '@volontariapp/errors-nest';

describe('EventService - Cover Photo & Idempotency (Unit)', () => {
  let service: EventService;
  let repoMock: ReturnType<typeof createEventRepositoryMock>;
  let tagServiceMock: ReturnType<typeof createTagServiceMock>;

  beforeEach(() => {
    repoMock = createEventRepositoryMock();
    tagServiceMock = createTagServiceMock();
    service = new EventService(repoMock, tagServiceMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create with cover and provided id', () => {
    it('should create event with cover file id and provided id', async () => {
      const eventData: Partial<EventEntity> = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Event with Cover',
        organizerId: 'org-1',
        coverFileId: 'file-cover-1',
      };

      const created = new EventEntity();
      created.id = eventData.id ?? 'default-id';
      created.name = eventData.name ?? 'default-name';
      created.organizerId = eventData.organizerId ?? 'default-org';
      created.coverFileId = eventData.coverFileId;
      created.coverStatus = CoverStatus.COVER_STATUS_PENDING;

      const createSpy = jest.spyOn(repoMock, 'createWithEventCreated').mockResolvedValue(created);

      const result = await service.create(eventData);

      expect(createSpy).toHaveBeenCalledWith(eventData);
      expect(result.coverFileId).toBe('file-cover-1');
      expect(result.coverStatus).toBe(CoverStatus.COVER_STATUS_PENDING);
    });

    it('should throw EVENT_ALREADY_EXISTS with id on 23505 PK conflict', async () => {
      const error = Object.assign(new Error('Unique violation'), {
        code: '23505',
        detail: 'Key (id)=(22222222-2222-2222-2222-222222222222) already exists.',
      });
      const createSpy = jest.spyOn(repoMock, 'createWithEventCreated').mockRejectedValue(error);

      const input = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Event 1',
      };

      await expect(service.create(input)).rejects.toThrow(
        EVENT_ALREADY_EXISTS('id: 22222222-2222-2222-2222-222222222222'),
      );
      expect(createSpy).toHaveBeenCalledWith(input);
    });
  });

  describe('updateCover', () => {
    it('should update event cover successfully', async () => {
      const updated = new EventEntity();
      updated.id = 'event-1';
      updated.coverFileId = 'new-file-1';
      updated.coverStatus = CoverStatus.COVER_STATUS_PENDING;

      const updateSpy = jest.spyOn(repoMock, 'updateCover').mockResolvedValue(updated);

      const result = await service.updateCover('event-1', 'new-file-1', 'user-1');

      expect(updateSpy).toHaveBeenCalledWith('event-1', 'new-file-1', 'user-1');
      expect(result.coverFileId).toBe('new-file-1');
    });

    it('should throw EVENT_NOT_FOUND when event does not exist', async () => {
      const updateSpy = jest.spyOn(repoMock, 'updateCover').mockResolvedValue(null);

      await expect(service.updateCover('unknown', 'file-1', 'user-1')).rejects.toThrow(
        EVENT_NOT_FOUND('unknown'),
      );
      expect(updateSpy).toHaveBeenCalledWith('unknown', 'file-1', 'user-1');
    });
  });

  describe('applyCoverResult', () => {
    it('should apply cover result successfully', async () => {
      const updated = new EventEntity();
      updated.id = 'event-1';
      updated.coverFileId = 'file-1';
      updated.coverStatus = CoverStatus.COVER_STATUS_READY;

      const applySpy = jest.spyOn(repoMock, 'applyCoverResult').mockResolvedValue(updated);

      const result = await service.applyCoverResult(
        'event-1',
        'file-1',
        CoverStatus.COVER_STATUS_READY,
      );

      expect(applySpy).toHaveBeenCalledWith('event-1', 'file-1', CoverStatus.COVER_STATUS_READY);
      expect(result.coverStatus).toBe(CoverStatus.COVER_STATUS_READY);
    });

    it('should throw EVENT_NOT_FOUND when event does not exist', async () => {
      const applySpy = jest.spyOn(repoMock, 'applyCoverResult').mockResolvedValue(null);

      await expect(
        service.applyCoverResult('unknown', 'file-1', CoverStatus.COVER_STATUS_READY),
      ).rejects.toThrow(EVENT_NOT_FOUND('unknown'));
      expect(applySpy).toHaveBeenCalledWith('unknown', 'file-1', CoverStatus.COVER_STATUS_READY);
    });
  });
});
