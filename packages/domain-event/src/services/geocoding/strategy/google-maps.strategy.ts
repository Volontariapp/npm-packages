import type {
  IGeocodingStrategy,
  GeocodeRequest,
  GeocodeResponse,
} from './geocoding-strategy.interface.js';
import { Logger } from '@volontariapp/logger';
import { GEOCODING_FAILED } from '@volontariapp/errors-nest';

export class GoogleMapsStrategy implements IGeocodingStrategy {
  private readonly logger = new Logger({ context: GoogleMapsStrategy.name });
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('GoogleMapsStrategy requires a valid API key.');
    }
  }

  async geocode(request: GeocodeRequest): Promise<GeocodeResponse | null> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('address', request.address);
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        this.logger.error(`Google Maps API responded with status: ${String(response.status)}`);
        throw GEOCODING_FAILED('Google Maps', response.status);
      }

      const data = (await response.json()) as {
        status: string;
        results: Array<{
          geometry: {
            location: {
              lat: number;
              lng: number;
            };
          };
        }>;
      };

      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }

      return null;
    } catch (error) {
      if (error instanceof Error && error.name === 'BadRequestError') throw error;

      const err = error as Error;
      this.logger.error('Google Maps geocoding error:', err);
      return null;
    }
  }
}
