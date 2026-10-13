import { describe, expect, it } from '@jest/globals';
import { resolveEnvironment } from '../environment.js';
import { buildResource } from '../resource.js';

describe('environment (Unit)', () => {
  describe('resolveEnvironment', () => {
    it('should read DD_ENV', () => {
      expect(resolveEnvironment(undefined, { DD_ENV: 'prod' })).toBe('prod');
    });

    it('should prefer the option over DD_ENV', () => {
      expect(resolveEnvironment('staging', { DD_ENV: 'prod' })).toBe('staging');
    });

    it('should trim the value', () => {
      expect(resolveEnvironment(undefined, { DD_ENV: ' prod ' })).toBe('prod');
    });

    it.each([undefined, '', '   '])('should return undefined when DD_ENV is %p', (value) => {
      expect(resolveEnvironment(undefined, { DD_ENV: value })).toBeUndefined();
    });

    it('should not guess the environment from NODE_ENV', () => {
      expect(resolveEnvironment(undefined, { NODE_ENV: 'production' })).toBeUndefined();
    });
  });

  describe('buildResource', () => {
    it('should add deployment.environment when an environment is given', () => {
      // Act
      const { attributes } = buildResource('ms-user', '1.2.3', 'prod');

      // Assert
      expect(attributes).toMatchObject({
        'service.name': 'ms-user',
        'service.version': '1.2.3',
        'deployment.environment': 'prod',
      });
    });

    it('should omit deployment.environment without an environment', () => {
      // Act
      const { attributes } = buildResource('ms-user', undefined, undefined);

      // Assert
      expect(attributes).not.toHaveProperty('deployment.environment');
      expect(attributes['service.version']).toBe('0.0.1');
    });
  });
});
