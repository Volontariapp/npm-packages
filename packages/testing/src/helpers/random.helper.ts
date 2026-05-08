import { randomUUID } from 'node:crypto';

/**
 * Generate a random UUID v4
 */
export const randomUuid = (): string => randomUUID();

/**
 * Generate a random string of a given length
 * @param length - Length of the string
 * @param alphabet - Characters to use (default: alphanumeric)
 */
export const randomString = (
  length = 10,
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
};

/**
 * Generate a random integer between min and max (inclusive)
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random email address
 */
export const randomEmail = (domain = 'example.com'): string => {
  return `${randomString(8).toLowerCase()}@${domain}`;
};
