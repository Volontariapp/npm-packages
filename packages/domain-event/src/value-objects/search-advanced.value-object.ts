import type { EventState, EventType } from '@volontariapp/contracts';
import { INVALID_LOCATION, INVALID_PARAMETER } from '@volontariapp/errors-nest';

export class SearchAdvancedVO {
  constructor(
    public readonly area?: { lat: number; lng: number; radiusInMeters: number },
    public readonly types?: EventType[],
    public readonly tagSlugs?: string[],
    public readonly onlyAvailable?: boolean,
    public readonly searchTerm?: string,
    public readonly organizerId?: string,
    public readonly ids?: string[],
    public readonly excludedIds?: string[],
    public readonly startDateFrom?: Date,
    public readonly startDateTo?: Date,
    public readonly statuses?: EventState[],
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.area) {
      if (this.area.lat < -90 || this.area.lat > 90) {
        throw INVALID_LOCATION('Latitude must be between -90 and 90');
      }
      if (this.area.lng < -180 || this.area.lng > 180) {
        throw INVALID_LOCATION('Longitude must be between -180 and 180');
      }
      if (this.area.radiusInMeters <= 0) {
        throw INVALID_PARAMETER('radiusInMeters', 'Radius must be greater than 0');
      }
    }

    if (this.startDateFrom && this.startDateTo) {
      if (this.startDateFrom > this.startDateTo) {
        throw INVALID_PARAMETER('startDate', 'End date must be after start date');
      }
    }

    if (this.page < 1) {
      throw INVALID_PARAMETER('page', 'Page must be greater than 0');
    }

    if (this.limit < 1 || this.limit > 100) {
      throw INVALID_PARAMETER('limit', 'Limit must be between 1 and 100');
    }
  }
}
