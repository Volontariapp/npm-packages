import { INVALID_LOCATION } from '@volontariapp/errors-nest';

export class EventLocation {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.latitude < -90 || this.latitude > 90) {
      throw INVALID_LOCATION('Latitude must be between -90 and 90');
    }
    if (this.longitude < -180 || this.longitude > 180) {
      throw INVALID_LOCATION('Longitude must be between -180 and 180');
    }
  }

  public equals(other: EventLocation): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }
}
