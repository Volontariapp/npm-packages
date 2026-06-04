import type {
  IGeocodingStrategy,
  GeocodeRequest,
  GeocodeResponse,
} from './strategy/geocoding-strategy.interface.js';
import { Logger } from '@volontariapp/logger';

export class GeocodingService {
  private readonly logger = new Logger({ context: GeocodingService.name });

  constructor(
    private readonly primaryStrategy: IGeocodingStrategy,
    private readonly fallbackStrategy?: IGeocodingStrategy,
  ) {}

  async geocode(address: string): Promise<GeocodeResponse | null> {
    const request: GeocodeRequest = { address };

    const primaryResult = await this.primaryStrategy.geocode(request);

    if (primaryResult !== null) {
      return primaryResult;
    }

    if (this.fallbackStrategy) {
      this.logger.warn('Primary geocoding failed, attempting fallback...');
      const fallbackResult = await this.fallbackStrategy.geocode(request);
      return fallbackResult;
    }

    return null;
  }
}
