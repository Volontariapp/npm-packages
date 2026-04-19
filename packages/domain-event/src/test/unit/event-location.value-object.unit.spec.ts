import { describe, it, expect } from '@jest/globals';
import { EventLocation } from '../../value-objects/event-location.value-object.js';

describe('EventLocation (Unit)', () => {
  describe('constructor — valid coordinates', () => {
    it('should create an instance with valid latitude and longitude', () => {
      // Arrange + Act
      const location = new EventLocation(48.8566, 2.3522);

      // Assert
      expect(location.latitude).toBe(48.8566);
      expect(location.longitude).toBe(2.3522);
    });

    it('should accept boundary values: latitude -90 and longitude -180', () => {
      const location = new EventLocation(-90, -180);
      expect(location.latitude).toBe(-90);
      expect(location.longitude).toBe(-180);
    });

    it('should accept boundary values: latitude 90 and longitude 180', () => {
      const location = new EventLocation(90, 180);
      expect(location.latitude).toBe(90);
      expect(location.longitude).toBe(180);
    });

    it('should accept zero coordinates', () => {
      const location = new EventLocation(0, 0);
      expect(location.latitude).toBe(0);
      expect(location.longitude).toBe(0);
    });
  });

  describe('constructor — invalid latitude', () => {
    it('should throw INVALID_LOCATION when latitude is below -90', () => {
      // Arrange + Act + Assert
      expect(() => new EventLocation(-90.001, 0)).toThrow('Latitude must be between -90 and 90');
    });

    it('should throw INVALID_LOCATION when latitude exceeds 90', () => {
      expect(() => new EventLocation(90.001, 0)).toThrow('Latitude must be between -90 and 90');
    });

    it('should throw INVALID_LOCATION for extreme negative latitude', () => {
      expect(() => new EventLocation(-180, 0)).toThrow('Latitude must be between -90 and 90');
    });
  });

  describe('constructor — invalid longitude', () => {
    it('should throw INVALID_LOCATION when longitude is below -180', () => {
      expect(() => new EventLocation(0, -180.001)).toThrow(
        'Longitude must be between -180 and 180',
      );
    });

    it('should throw INVALID_LOCATION when longitude exceeds 180', () => {
      expect(() => new EventLocation(0, 180.001)).toThrow('Longitude must be between -180 and 180');
    });

    it('should throw INVALID_LOCATION for extreme positive longitude', () => {
      expect(() => new EventLocation(0, 360)).toThrow('Longitude must be between -180 and 180');
    });
  });

  describe('equals()', () => {
    it('should return true when both locations have the same coordinates', () => {
      // Arrange
      const a = new EventLocation(48.8566, 2.3522);
      const b = new EventLocation(48.8566, 2.3522);

      // Act + Assert
      expect(a.equals(b)).toBe(true);
    });

    it('should return false when latitudes differ', () => {
      const a = new EventLocation(48.8566, 2.3522);
      const b = new EventLocation(48.8, 2.3522);
      expect(a.equals(b)).toBe(false);
    });

    it('should return false when longitudes differ', () => {
      const a = new EventLocation(48.8566, 2.3522);
      const b = new EventLocation(48.8566, 2.0);
      expect(a.equals(b)).toBe(false);
    });

    it('should return false when both coordinates differ', () => {
      const a = new EventLocation(0, 0);
      const b = new EventLocation(1, 1);
      expect(a.equals(b)).toBe(false);
    });

    it('should return true for zero coordinates compared to itself', () => {
      const location = new EventLocation(0, 0);
      expect(location.equals(location)).toBe(true);
    });
  });
});
