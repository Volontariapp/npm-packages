import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { OpenStreetMapStrategy } from '../../../../../services/geocoding/strategy/open-street-map.strategy.js';

describe('OpenStreetMapStrategy', () => {
  let strategy: OpenStreetMapStrategy;

  beforeEach(() => {
    strategy = new OpenStreetMapStrategy('TestUserAgent/1.0', false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should rate limit 10 requests to ~1.1s each sequentially', async () => {
    jest.useFakeTimers();
    let activeRequests = 0;

    const axiosSpy = jest
      .spyOn(axios, 'get')
      .mockImplementation(async (): Promise<AxiosResponse> => {
        await Promise.resolve();
        activeRequests++;
        return {
          data: [{ lat: '48.8566', lon: '2.3522' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig,
        } as AxiosResponse;
      });

    const promises = Array.from({ length: 10 }).map((_, i) =>
      strategy.geocode({ address: `Address ${String(i)}` }),
    );

    await Promise.resolve();

    expect(activeRequests).toBe(0);

    for (let i = 1; i <= 10; i++) {
      jest.advanceTimersByTime(1100);
      for (let j = 0; j < 5; j++) {
        await Promise.resolve();
      }
      expect(activeRequests).toBe(i);
    }

    const results = await Promise.all(promises);

    expect(axiosSpy).toHaveBeenCalledTimes(10);
    expect(results).toHaveLength(10);
    results.forEach((result) => {
      expect(result).toEqual({ lat: 48.8566, lng: 2.3522 });
    });
  });

  it('should hit the cache instantly for the same address', async () => {
    jest.useFakeTimers();

    const axiosSpy = jest
      .spyOn(axios, 'get')
      .mockImplementation(async (): Promise<AxiosResponse> => {
        await Promise.resolve();
        return {
          data: [{ lat: '48.8566', lon: '2.3522' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig,
        } as AxiosResponse;
      });

    const promise1 = strategy.geocode({ address: 'Cached Address' });

    await Promise.resolve();
    jest.advanceTimersByTime(1100);
    for (let j = 0; j < 5; j++) {
      await Promise.resolve();
    }

    const res1 = await promise1;
    const res2 = await strategy.geocode({ address: 'Cached Address' });

    expect(axiosSpy).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(res2);
  });
});
