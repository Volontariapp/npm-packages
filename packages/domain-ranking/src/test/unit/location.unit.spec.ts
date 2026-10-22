import { randomBytes } from 'node:crypto';
import { describe, it, expect } from '@jest/globals';
import { encrypt } from '@volontariapp/crypto';
import {
  InvalidLocationCipherException,
  decryptLocation,
  encryptLocation,
  hasMovedFar,
  haversineKm,
  originFromHistory,
  roundToKilometer,
} from '../../index.js';

const KEY = randomBytes(32);
const PARIS = { lat: 48.856614, lng: 2.352222 };

describe('geo', () => {
  it('should measure the distance between two points', () => {
    const lyon = { lat: 45.764043, lng: 4.835659 };

    expect(haversineKm(PARIS, lyon)).toBeGreaterThan(390);
    expect(haversineKm(PARIS, lyon)).toBeLessThan(395);
    expect(haversineKm(PARIS, PARIS)).toBe(0);
  });

  it('should round a position to about 1 km, never more', () => {
    const rounded = roundToKilometer(PARIS);

    expect(haversineKm(PARIS, rounded)).toBeLessThan(1);
    expect(rounded).not.toEqual(PARIS);
  });

  it('should be idempotent and give the same cell for two close positions', () => {
    const once = roundToKilometer(PARIS);

    expect(roundToKilometer(once)).toEqual(once);
    expect(roundToKilometer({ lat: PARIS.lat + 0.0001, lng: PARIS.lng + 0.0001 })).toEqual(once);
  });

  it('should find the centre of the history, or nothing without history', () => {
    expect(originFromHistory([])).toBeNull();
    expect(originFromHistory([{ lat: 0, lng: 0 }, { lat: 2, lng: 4 }])).toEqual({ lat: 1, lng: 2 });
  });

  it('should ask for a refresh only after a move of more than 10 km, or without a previous position', () => {
    expect(hasMovedFar(null, PARIS)).toBe(true);
    expect(hasMovedFar(PARIS, { lat: PARIS.lat + 0.05, lng: PARIS.lng })).toBe(false);
    expect(hasMovedFar(PARIS, { lat: PARIS.lat + 0.2, lng: PARIS.lng })).toBe(true);
  });
});

describe('location cipher', () => {
  it('should decrypt to the rounded position of its owner', () => {
    const stored = encryptLocation('user-1', PARIS, KEY);

    expect(decryptLocation('user-1', stored, KEY)).toEqual(roundToKilometer(PARIS));
  });

  it('should not contain the position in clear', () => {
    const stored = encryptLocation('user-1', PARIS, KEY).toString('utf8');

    expect(stored).not.toContain('48.85');
    expect(stored).not.toContain('user-1');
  });

  it('should be random: two encryptions of the same position differ', () => {
    expect(encryptLocation('user-1', PARIS, KEY).equals(encryptLocation('user-1', PARIS, KEY))).toBe(
      false,
    );
  });

  it('should refuse a ciphertext moved to another user', () => {
    const stored = encryptLocation('user-1', PARIS, KEY);

    expect(() => decryptLocation('user-2', stored, KEY)).toThrow(InvalidLocationCipherException);
  });

  it('should refuse another key', () => {
    const stored = encryptLocation('user-1', PARIS, KEY);

    expect(() => decryptLocation('user-1', stored, randomBytes(32))).toThrow();
  });

  it('should refuse an unknown format version', () => {
    const stored = Buffer.from(encrypt('v2|user-1|48.85|2.35', KEY), 'utf8');

    expect(() => decryptLocation('user-1', stored, KEY)).toThrow('unknown format');
  });

  it('should refuse unreadable coordinates', () => {
    const stored = Buffer.from(encrypt('v1|user-1|north|east', KEY), 'utf8');

    expect(() => decryptLocation('user-1', stored, KEY)).toThrow('unreadable coordinates');
  });
});
