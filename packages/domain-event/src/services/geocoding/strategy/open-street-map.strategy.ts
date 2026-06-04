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

  constructor(private readonly userAgent: string) {
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

  async geocode(request: GeocodeRequest): Promise<GeocodeResponse | null> {
    try {
      await this.delayIfNeeded();

      const url = new URL(this.baseUrl);
      url.searchParams.append('q', request.address);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '1');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error('OSM API responded with status:', String(response.status));
        throw GEOCODING_FAILED('OSM', response.status);
      }

      const data = (await response.json()) as NominatimResult[];

      if (data.length > 0) {
        const { lat, lon } = data[0];
        return {
          lat: parseFloat(lat),
          lng: parseFloat(lon),
        };
      }
      return null;
    } catch (error) {
      if (error instanceof Error && error.name === 'BadRequestError') throw error;

      const err = error as Error;
      this.logger.error('OpenStreetMap geocoding error:', err);
      return null;
    }
  }
}
