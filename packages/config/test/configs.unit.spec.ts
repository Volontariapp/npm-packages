import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import {
  BaseConfig,
  BackendConfig,
  FrontendConfig,
  NodeEnv,
  LoggerFormat,
  PostgresConfig,
  RedisConfig,
  Neo4jConfig,
  LoggerConfig,
} from '../src/index.js';

describe('Config Classes Unit Tests', () => {
  describe('BaseConfig', () => {
    it('should have correct default values', () => {
      const config = new BaseConfig();
      expect(config.nodeEnv).toBe(NodeEnv.DEVELOPMENT);
      expect(config.logger).toBeInstanceOf(LoggerConfig);
    });

    it('should return correct logger format based on environment', () => {
      const config = new BaseConfig();

      config.nodeEnv = NodeEnv.PRODUCTION;
      expect(config.getLoggerFormat()).toBe(LoggerFormat.JSON);

      config.nodeEnv = NodeEnv.DEVELOPMENT;
      expect(config.getLoggerFormat()).toBe(LoggerFormat.TEXT);
    });

    it('should respect explicit logger format override', () => {
      const config = new BaseConfig();
      config.nodeEnv = NodeEnv.PRODUCTION;
      config.logger.format = LoggerFormat.TEXT;
      expect(config.getLoggerFormat()).toBe(LoggerFormat.TEXT);
    });
  });

  describe('PostgresConfig', () => {
    it('should have correct default values', () => {
      const pg = new PostgresConfig();
      expect(pg.maxPoolSize).toBe(10);
      expect(pg.ssl).toBe(false);
    });

    it('should convert string to number via @Type', () => {
      const plain = { maxPoolSize: '25', host: 'localhost', port: '5432' };
      const pg = plainToInstance(PostgresConfig, plain, { enableImplicitConversion: true });
      expect(pg.maxPoolSize).toBe(25);
      expect(pg.port).toBe(5432);
    });
  });

  describe('RedisConfig', () => {
    it('should have correct default values', () => {
      const redis = new RedisConfig();
      expect(redis.dbIndex).toBe(0);
    });

    it('should convert string to number via @Type', () => {
      const plain = { dbIndex: '2', host: 'localhost', port: '6379' };
      const redis = plainToInstance(RedisConfig, plain, { enableImplicitConversion: true });
      expect(redis.dbIndex).toBe(2);
    });
  });

  describe('Neo4jConfig', () => {
    it('should have correct default values', () => {
      const neo = new Neo4jConfig();
      expect(neo.scheme).toBe('neo4j');
    });
  });

  describe('BackendConfig', () => {
    it('should be instance of BaseConfig', () => {
      const config = new BackendConfig();
      expect(config).toBeInstanceOf(BaseConfig);
    });
  });

  describe('FrontendConfig', () => {
    it('should be instance of BaseConfig', () => {
      const config = new FrontendConfig();
      expect(config).toBeInstanceOf(BaseConfig);
    });
  });
});
