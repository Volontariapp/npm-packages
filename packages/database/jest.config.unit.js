import baseConfig from './jest.config.js';
export default {
  ...baseConfig,
  globalSetup: undefined,
  testMatch: ['**/*.unit.spec.ts'],
};
