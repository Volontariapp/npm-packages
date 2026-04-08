import { Logger } from '../../logger.js';

// 1. NodeJS Example
const nodeLogger = new Logger({
  context: 'NodeWorker',
  format: 'text',
  minLevel: 'debug',
});

nodeLogger.info('NodeJS worker started correctly');
nodeLogger.debug('Some debug information', { processId: process.pid });
nodeLogger.error('Failed to parse config', new Error('Config missing'));

// 2. NestJS Style Example
// Imagine this class receives the Logger injected.
class NestJSService {
  private readonly logger = new Logger({ context: 'NestJSService', format: 'json' });

  doSomething() {
    this.logger.log('Action performed from NestJS styled logger');
    this.logger.verbose('Verbose detail');
  }
}

new NestJSService().doSomething();

// 3. React Native Example
const rnLogger = new Logger({
  context: 'ReactNativeApp',
  format: 'text', // Text format is useful for Metro bundler console
});

rnLogger.info('Screen loaded', { screenName: 'Home' });
rnLogger.warn('Slow render detected');
