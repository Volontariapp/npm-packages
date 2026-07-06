import { describe, it, expect } from '@jest/globals';
import { SearchAdvancedVO } from '../../value-objects/search-advanced.value-object.js';
import { EventType, EventState } from '@volontariapp/contracts';

describe('SearchAdvancedVO', () => {
  it('should create successfully with valid data', () => {
    const vo = new SearchAdvancedVO(
      { lat: 48.8566, lng: 2.3522, radiusInMeters: 5000 },
      [EventType.EVENT_TYPE_SOCIAL],
      ['tag-1'],
      true,
      'test search',
      'org-1',
      ['id-1'],
      ['ex-1'],
      new Date('2023-01-01'),
      new Date('2023-12-31'),
      [EventState.EVENT_STATE_PUBLISHED],
      2,
      20,
    );

    expect(vo.area?.lat).toBe(48.8566);
    expect(vo.page).toBe(2);
    expect(vo.limit).toBe(20);
  });

  it('should use default pagination values', () => {
    const vo = new SearchAdvancedVO();
    expect(vo.page).toBe(1);
    expect(vo.limit).toBe(10);
  });

  it('should throw if latitude is invalid', () => {
    expect(() => new SearchAdvancedVO({ lat: 100, lng: 0, radiusInMeters: 10 })).toThrow(Error);
  });

  it('should throw if longitude is invalid', () => {
    expect(() => new SearchAdvancedVO({ lat: 0, lng: 200, radiusInMeters: 10 })).toThrow(Error);
  });

  it('should throw if radius is invalid', () => {
    expect(() => new SearchAdvancedVO({ lat: 0, lng: 0, radiusInMeters: 0 })).toThrow(Error);
  });

  it('should throw if startDateFrom is after startDateTo', () => {
    expect(
      () =>
        new SearchAdvancedVO(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          new Date('2023-12-31'),
          new Date('2023-01-01'),
        ),
    ).toThrow(Error);
  });

  it('should throw if page is less than 1', () => {
    expect(
      () =>
        new SearchAdvancedVO(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          0,
        ),
    ).toThrow(Error);
  });

  it('should throw if limit is less than 1', () => {
    expect(
      () =>
        new SearchAdvancedVO(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          0,
        ),
    ).toThrow(Error);
  });

  it('should throw if limit is greater than 100', () => {
    expect(
      () =>
        new SearchAdvancedVO(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          101,
        ),
    ).toThrow(Error);
  });
});
