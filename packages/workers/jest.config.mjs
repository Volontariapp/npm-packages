/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  globalSetup:
    process.env.INTEGRATION === 'true' ? '<rootDir>/src/test/global-setup.ts' : undefined,
  maxWorkers: process.env.INTEGRATION === 'true' ? 1 : '50%',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@volontariapp/database$': '<rootDir>/../database/src/index.ts',
    '^@volontariapp/testing$': '<rootDir>/../testing/src/index.ts',
    '^@volontariapp/messaging$': '<rootDir>/../messaging/src/index.ts',
    '^@volontariapp/logger$': '<rootDir>/../logger/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/dist/**', '!**/index.ts'],
  testMatch: process.env.INTEGRATION === 'true' ? ['**/*.spec.ts'] : ['**/*.unit.spec.ts'],
};
