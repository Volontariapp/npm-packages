import { describe, expect, it } from '@jest/globals';
import { buildInstrumentationConfig, sanitizeRedisCommand } from '../tracing.js';

describe('tracing instrumentation config (Unit)', () => {
  describe('sanitizeRedisCommand', () => {
    it('should return only the command name', () => {
      expect(sanitizeRedisCommand('XADD')).toBe('XADD');
      expect(sanitizeRedisCommand('SET')).toBe('SET');
      expect(sanitizeRedisCommand('HSET')).toBe('HSET');
      expect(sanitizeRedisCommand('EVALSHA')).toBe('EVALSHA');
    });
  });

  describe('buildInstrumentationConfig', () => {
    it('should disable noisy filesystem and DNS instrumentations', () => {
      const config = buildInstrumentationConfig();

      expect(config['@opentelemetry/instrumentation-fs']).toEqual({ enabled: false });
      expect(config['@opentelemetry/instrumentation-dns']).toEqual({ enabled: false });
    });

    it('should lock down PostgreSQL instrumentation without enhanced reporting', () => {
      const config = buildInstrumentationConfig();

      expect(config['@opentelemetry/instrumentation-pg']).toEqual({
        enhancedDatabaseReporting: false,
      });
    });

    it('should configure Redis and IORedis with statement serializers stripping arguments', () => {
      const config = buildInstrumentationConfig();

      const ioRedisSerializer = config['@opentelemetry/instrumentation-ioredis'].dbStatementSerializer;
      const redisSerializer = config['@opentelemetry/instrumentation-redis'].dbStatementSerializer;

      expect(typeof ioRedisSerializer).toBe('function');
      expect(typeof redisSerializer).toBe('function');

      // Verify that passing sensitive command arguments returns only the command name
      expect(ioRedisSerializer('XADD', ['storage:file_scanned', '*', 'fileId', 'secret-uuid'])).toBe('XADD');
      expect(redisSerializer('SET', ['session:token_123', 'bearer_secret'])).toBe('SET');
    });
  });
});
