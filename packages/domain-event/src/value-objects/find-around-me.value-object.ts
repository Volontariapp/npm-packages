import type { EventState, EventType } from '@volontariapp/contracts';
import { INVALID_LOCATION, INVALID_PARAMETER } from '@volontariapp/errors-nest';

export class FindAroundMeVO {
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly radiusInMeters: number,
    public readonly type?: EventType,
    public readonly state?: EventState,
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
    if (this.radiusInMeters <= 0) {
      throw INVALID_PARAMETER('radiusInMeters', 'Radius must be greater than 0');
    }
  }
}
