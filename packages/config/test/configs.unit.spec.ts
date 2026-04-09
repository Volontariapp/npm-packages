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
  });

  describe('PostgresConfig', () => {
    it('should convert string to number via @Type and handle mandatory fields', () => {
      const plain = {
        maxPoolSize: '25',
        host: 'localhost',
        port: '5432',
        username: 'u',
        password: 'p',
        database: 'd',
        ssl: 'true',
      };
      const pg = plainToInstance(PostgresConfig, plain, { enableImplicitConversion: true });
      expect(pg.maxPoolSize).toBe(25);
      expect(pg.port).toBe(5432);
      expect(pg.ssl).toBe(true);
    });
  });

  describe('RedisConfig', () => {
    it('should handle mandatory fields and optional tricky fields', () => {
      const plain = {
        host: 'localhost',
        port: '6379',
        username: 'u',
        password: 'p',
        database: 'd',
        dbIndex: '2',
      };
      const redis = plainToInstance(RedisConfig, plain, { enableImplicitConversion: true });
      expect(redis.dbIndex).toBe(2);
      expect(redis.keyPrefix).toBeUndefined();
    });
  });

  describe('Neo4jConfig', () => {
    it('should handle mandatory scheme', () => {
      const plain = {
        host: 'localhost',
        port: '7687',
        username: 'u',
        password: 'p',
        database: 'd',
        scheme: 'bolt',
      };
      const neo = plainToInstance(Neo4jConfig, plain, { enableImplicitConversion: true });
      expect(neo.scheme).toBe('bolt');
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
