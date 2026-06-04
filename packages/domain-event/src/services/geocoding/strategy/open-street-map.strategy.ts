import axios from 'axios';
import type {
  IGeocodingStrategy,
  GeocodeRequest,
  GeocodeResponse,
} from './geocoding-strategy.interface.js';
import { Logger } from '@volontariapp/logger';
import { GEOCODING_FAILED } from '@volontariapp/errors-nest';

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name?: string;
}

export class OpenStreetMapStrategy implements IGeocodingStrategy {
  private readonly logger = new Logger({ context: OpenStreetMapStrategy.name });
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';

  private static rateLimitPromise: Promise<void> = Promise.resolve();
  private readonly rateLimitMs = 1100;

  constructor(
    private readonly userAgent: string,
    private readonly skipInTestEnv: boolean = false,
  ) {
    if (!this.userAgent) {
      throw new Error('OpenStreetMapStrategy requires a valid userAgent.');
    }
  }

  private async delayIfNeeded(): Promise<void> {
    const nextPromise = OpenStreetMapStrategy.rateLimitPromise.then(async () => {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitMs));
    });
    OpenStreetMapStrategy.rateLimitPromise = nextPromise.catch(() => {});
    await nextPromise;
  }

  private static cache = new Map<string, GeocodeResponse | null>();

  async geocode(request: GeocodeRequest): Promise<GeocodeResponse | null> {
    if (this.skipInTestEnv) {
      return { lat: 48.8566, lng: 2.3522 };
    }

    try {
      if (OpenStreetMapStrategy.cache.has(request.address)) {
        return OpenStreetMapStrategy.cache.get(request.address) as GeocodeResponse | null;
      }

      await this.delayIfNeeded();

      const response = await axios.get<NominatimResult[]>(this.baseUrl, {
        params: {
          q: request.address,
          format: 'json',
          limit: '1',
        },
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 5000,
      });

      const data = response.data;

      if (data.length > 0) {
        const { lat, lon } = data[0];
        const result = {
          lat: parseFloat(lat),
          lng: parseFloat(lon),
        };
        OpenStreetMapStrategy.cache.set(request.address, result);
        return result;
      }
      OpenStreetMapStrategy.cache.set(request.address, null);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error('OSM API responded with status:', String(error.response.status));
        throw GEOCODING_FAILED('OSM', error.response.status);
      }
      if (error instanceof Error && error.name === 'BadRequestError') throw error;

      const err = error as Error;
      this.logger.error('OpenStreetMap geocoding error:', err);
      return null;
    }
  }
}
