import { DEFAULT_LOCATION_REFRESH_KM } from '../constants/index.js';

export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE = 111.32;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const haversineKm = (from: GeoPoint, to: GeoPoint): number => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * Snaps a position to a grid of about 1 km. A precise position is never stored: this is the
 * only position the service keeps. The longitude step widens with the latitude so that a cell
 * stays about 1 km wide.
 */
export const roundToKilometer = (point: GeoPoint): GeoPoint => {
  const latStep = 1 / KM_PER_DEGREE;
  const lat = Math.round(point.lat / latStep) * latStep;
  const lngStep = 1 / (KM_PER_DEGREE * Math.max(Math.cos(toRadians(lat)), 0.01));
  const lng = Math.round(point.lng / lngStep) * lngStep;
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
};

/** Fallback origin when the position is unknown: the centre of the events already joined or wished. */
export const originFromHistory = (points: readonly GeoPoint[]): GeoPoint | null => {
  if (points.length === 0) return null;
  const total = points.reduce((sum, point) => ({ lat: sum.lat + point.lat, lng: sum.lng + point.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: total.lat / points.length, lng: total.lng / points.length };
};

/** A new position triggers a STALE_REFRESH only when the user moved far enough. */
export const hasMovedFar = (
  previous: GeoPoint | null,
  next: GeoPoint,
  thresholdKm: number = DEFAULT_LOCATION_REFRESH_KM,
): boolean => previous === null || haversineKm(previous, next) > thresholdKm;
