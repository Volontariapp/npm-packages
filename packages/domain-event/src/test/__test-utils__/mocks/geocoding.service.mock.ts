import { createMock } from '@volontariapp/testing';
import type { GeocodingService } from '../../../services/geocoding/geocoding.service.js';

export const createGeocodingServiceMock = () => createMock<GeocodingService>();
