import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_METER_NAME,
  getMeter,
  createCounter,
  createUpDownCounter,
  createHistogram,
  createGauge,
  createObservableGauge,
} from '../metrics.js';

describe('metrics helpers (Unit)', () => {
  describe('getMeter', () => {
    it('should return a valid Meter instance with default meter name', () => {
      const meter = getMeter();
      expect(meter).toBeDefined();
      expect(typeof meter.createCounter).toBe('function');
      expect(typeof meter.createHistogram).toBe('function');
      expect(typeof meter.createUpDownCounter).toBe('function');
    });

    it('should allow specifying a custom meter name and version', () => {
      const customMeter = getMeter('custom-service', '1.0.0');
      expect(customMeter).toBeDefined();
      expect(typeof customMeter.createCounter).toBe('function');
    });

    it('should expose the default meter constant', () => {
      expect(DEFAULT_METER_NAME).toBe('@volontariapp/monitoring');
    });
  });

  describe('createCounter', () => {
    it('should create a counter with a description string', () => {
      const counter = createCounter('test.counter.simple', 'A simple counter');
      expect(counter).toBeDefined();
      expect(typeof counter.add).toBe('function');

      expect(() => {
        counter.add(1, { env: 'test', service: 'ms-user' });
      }).not.toThrow();
    });

    it('should create a counter with a MetricOptions object', () => {
      const counter = createCounter('test.counter.options', {
        description: 'Detailed counter',
        unit: '{requests}',
      });
      expect(counter).toBeDefined();

      expect(() => {
        counter.add(5);
      }).not.toThrow();
    });
  });

  describe('createUpDownCounter', () => {
    it('should create an UpDownCounter with string description', () => {
      const upDownCounter = createUpDownCounter('test.up_down.simple', 'Queue size');
      expect(upDownCounter).toBeDefined();
      expect(typeof upDownCounter.add).toBe('function');

      expect(() => {
        upDownCounter.add(10, { queue: 'events' });
        upDownCounter.add(-3, { queue: 'events' });
      }).not.toThrow();
    });

    it('should create an UpDownCounter with MetricOptions', () => {
      const upDownCounter = createUpDownCounter('test.up_down.options', {
        description: 'Active connections',
        unit: '{connections}',
      });
      expect(upDownCounter).toBeDefined();

      expect(() => {
        upDownCounter.add(1);
      }).not.toThrow();
    });
  });

  describe('createHistogram', () => {
    it('should create a histogram with string description', () => {
      const histogram = createHistogram('test.histogram.latency', 'Job duration in ms');
      expect(histogram).toBeDefined();
      expect(typeof histogram.record).toBe('function');

      expect(() => {
        histogram.record(125.5, { status: 'success' });
      }).not.toThrow();
    });

    it('should create a histogram with MetricOptions', () => {
      const histogram = createHistogram('test.histogram.payload_size', {
        description: 'Payload size in bytes',
        unit: 'By',
      });
      expect(histogram).toBeDefined();

      expect(() => {
        histogram.record(1024);
      }).not.toThrow();
    });
  });

  describe('createGauge', () => {
    it('should create a synchronous gauge with string description', () => {
      const gauge = createGauge('test.gauge.memory', 'Memory utilization');
      expect(gauge).toBeDefined();
      expect(typeof gauge.record).toBe('function');

      expect(() => {
        gauge.record(78.5, { host: 'node-1' });
      }).not.toThrow();
    });

    it('should create a synchronous gauge with MetricOptions', () => {
      const gauge = createGauge('test.gauge.options', {
        description: 'Disk percentage',
        unit: '%',
      });
      expect(gauge).toBeDefined();

      expect(() => {
        gauge.record(45);
      }).not.toThrow();
    });
  });

  describe('createObservableGauge', () => {
    it('should create an asynchronous ObservableGauge', () => {
      const observableGauge = createObservableGauge('test.observable_gauge.lag', 'Redis Stream lag');
      expect(observableGauge).toBeDefined();
      expect(typeof observableGauge.addCallback).toBe('function');
      expect(typeof observableGauge.removeCallback).toBe('function');
    });

    it('should create an ObservableGauge with MetricOptions', () => {
      const observableGauge = createObservableGauge('test.observable_gauge.options', {
        description: 'Lag in messages',
        unit: '{messages}',
      });
      expect(observableGauge).toBeDefined();
    });
  });
});

