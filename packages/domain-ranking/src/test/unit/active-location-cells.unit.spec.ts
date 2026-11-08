import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  DEFAULT_ACTIVE_LOCATION_MAX_AGE_MINUTES,
  MAX_ACTIVE_LOCATIONS,
  RankingLocationService,
  encryptLocation,
  roundToKilometer,
} from '../../index.js';
import { createLocationRepositoryMock } from '../__test-utils__/mocks/ranking-repositories.mock.js';

const KEY = randomBytes(32);
const NOW = new Date('2026-11-08T12:00:00Z');
const PARIS = { lat: 48.856614, lng: 2.352222 };
const LYON = { lat: 45.764043, lng: 4.835659 };

const stored = (userId: string, point: { lat: number; lng: number }, key = KEY) => ({
  userId,
  encrypted: encryptLocation(userId, point, key),
  updatedAt: NOW,
});

describe('RankingLocationService.listActiveCells', () => {
  const repository = createLocationRepositoryMock();
  const service = new RankingLocationService(repository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return one cell per distinct rounded position, never one per user', async () => {
    repository.findUpdatedSince.mockResolvedValue([
      stored('user-1', PARIS),
      stored('user-2', { lat: PARIS.lat + 0.0001, lng: PARIS.lng + 0.0001 }),
      stored('user-3', LYON),
    ]);

    const cells = await service.listActiveCells(30, KEY, NOW);

    expect(cells).toHaveLength(2);
    expect(cells).toEqual(
      expect.arrayContaining([roundToKilometer(PARIS), roundToKilometer(LYON)]),
    );
  });

  it('should expose nothing but the coordinates', async () => {
    repository.findUpdatedSince.mockResolvedValue([stored('user-1', PARIS)]);

    const [cell] = await service.listActiveCells(30, KEY, NOW);

    expect(Object.keys(cell).sort()).toEqual(['lat', 'lng']);
  });

  it('should read only the positions updated within the requested window', async () => {
    repository.findUpdatedSince.mockResolvedValue([]);

    await service.listActiveCells(15, KEY, NOW);

    expect(repository.findUpdatedSince).toHaveBeenCalledWith(
      new Date('2026-11-08T11:45:00Z'),
      MAX_ACTIVE_LOCATIONS,
    );
  });

  it('should use the default window when none is given', async () => {
    repository.findUpdatedSince.mockResolvedValue([]);

    await service.listActiveCells(0, KEY, NOW);

    const since = new Date(NOW.getTime() - DEFAULT_ACTIVE_LOCATION_MAX_AGE_MINUTES * 60_000);
    expect(repository.findUpdatedSince).toHaveBeenCalledWith(since, MAX_ACTIVE_LOCATIONS);
  });

  it('should skip a position it cannot decrypt without failing the whole list', async () => {
    repository.findUpdatedSince.mockResolvedValue([
      stored('user-1', PARIS, randomBytes(32)),
      stored('user-2', LYON),
    ]);

    const cells = await service.listActiveCells(30, KEY, NOW);

    expect(cells).toEqual([roundToKilometer(LYON)]);
  });

  it('should skip a ciphertext stored under another user', async () => {
    repository.findUpdatedSince.mockResolvedValue([
      { ...stored('user-1', PARIS), userId: 'user-9' },
      stored('user-2', LYON),
    ]);

    const cells = await service.listActiveCells(30, KEY, NOW);

    expect(cells).toEqual([roundToKilometer(LYON)]);
  });
});
