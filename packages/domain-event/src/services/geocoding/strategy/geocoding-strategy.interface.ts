export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
}

export interface IGeocodingStrategy {
  geocode(request: GeocodeRequest): Promise<GeocodeResponse | null>;
}
