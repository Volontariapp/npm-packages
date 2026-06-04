import type { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { GeocodingService } from '../../services/geocoding/geocoding.service.js';
import type { IGeocodingStrategy } from '../../services/geocoding/strategy/geocoding-strategy.interface.js';
import { createMock } from '@volontariapp/testing';

describe('GeocodingService (Unit)', () => {
  let primaryStrategyMock: jest.Mocked<IGeocodingStrategy>;
  let fallbackStrategyMock: jest.Mocked<IGeocodingStrategy>;
  let service: GeocodingService;
  let serviceWithFallback: GeocodingService;

  beforeEach(() => {
    primaryStrategyMock = createMock<IGeocodingStrategy>();
    fallbackStrategyMock = createMock<IGeocodingStrategy>();

    service = new GeocodingService(primaryStrategyMock);
    serviceWithFallback = new GeocodingService(primaryStrategyMock, fallbackStrategyMock);
  });

  it('should return primary strategy result if it succeeds', async () => {
    // Arrange
    const expectedResult = { lat: 48.8566, lng: 2.3522 };
    primaryStrategyMock.geocode.mockResolvedValue(expectedResult);

    // Act
    const result = await serviceWithFallback.geocode('Paris, France');

    // Assert
    expect(result).toEqual(expectedResult);
    expect(primaryStrategyMock.geocode).toHaveBeenCalledWith({ address: 'Paris, France' });
    expect(fallbackStrategyMock.geocode).not.toHaveBeenCalled();
  });

  it('should fallback to secondary strategy if primary returns null', async () => {
    // Arrange
    const expectedResult = { lat: 48.8566, lng: 2.3522 };
    primaryStrategyMock.geocode.mockResolvedValue(null);
    fallbackStrategyMock.geocode.mockResolvedValue(expectedResult);

    // Act
    const result = await serviceWithFallback.geocode('Paris, France');

    // Assert
    expect(result).toEqual(expectedResult);
    expect(primaryStrategyMock.geocode).toHaveBeenCalledWith({ address: 'Paris, France' });
    expect(fallbackStrategyMock.geocode).toHaveBeenCalledWith({ address: 'Paris, France' });
  });

  it('should return null if both primary and fallback return null', async () => {
    // Arrange
    primaryStrategyMock.geocode.mockResolvedValue(null);
    fallbackStrategyMock.geocode.mockResolvedValue(null);

    // Act
    const result = await serviceWithFallback.geocode('Unknown Place');

    // Assert
    expect(result).toBeNull();
    expect(primaryStrategyMock.geocode).toHaveBeenCalled();
    expect(fallbackStrategyMock.geocode).toHaveBeenCalled();
  });

  it('should return null if primary fails and no fallback is provided', async () => {
    // Arrange
    primaryStrategyMock.geocode.mockResolvedValue(null);

    // Act
    const result = await service.geocode('Unknown Place');

    // Assert
    expect(result).toBeNull();
    expect(primaryStrategyMock.geocode).toHaveBeenCalled();
  });
});
