import axios from 'axios';
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
  private static cache = new Map<string, GeocodeResponse | null>();

  constructor(
    private readonly apiKey: string,
    private readonly skipInTestEnv: boolean = false,
  ) {
    if (!this.apiKey) {
      throw new Error('GoogleMapsStrategy requires a valid API key.');
    }
  }

  async geocode(request: GeocodeRequest): Promise<GeocodeResponse | null> {
    if (this.skipInTestEnv) {
      return { lat: 48.8566, lng: 2.3522 };
    }

    try {
      if (GoogleMapsStrategy.cache.has(request.address)) {
        return GoogleMapsStrategy.cache.get(request.address) as GeocodeResponse | null;
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          address: request.address,
          key: this.apiKey,
        },
        timeout: 5000,
      });

      const data = response.data as {
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
        const result = { lat, lng };
        GoogleMapsStrategy.cache.set(request.address, result);
        return result;
      }

      GoogleMapsStrategy.cache.set(request.address, null);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Google Maps API responded with status: ${String(error.response.status)}`,
        );
        throw GEOCODING_FAILED('Google Maps', error.response.status);
      }
      if (error instanceof Error && error.name === 'BadRequestError') throw error;

      const err = error as Error;
      this.logger.error('Google Maps geocoding error:', err);
      return null;
    }
  }
}
