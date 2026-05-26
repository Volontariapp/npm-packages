/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  globalSetup: ['true', 'all'].includes(process.env.INTEGRATION ?? '')
    ? '<rootDir>/src/test/global-setup.ts'
    : undefined,
  maxWorkers: ['true', 'all'].includes(process.env.INTEGRATION ?? '') ? 1 : '50%',
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
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/', '/src/test/'],
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/index.ts',
    '!**/*.spec.ts',
    '!**/*.int.spec.ts',
    '!src/test/**',
    '!src/interfaces/**',
    '!src/types/**',
    '!**/*.interface.ts',
    '!**/*.types.ts',
  ],
  testMatch:
    process.env.INTEGRATION === 'true'
      ? ['**/*.int.spec.ts']
      : process.env.INTEGRATION === 'all'
        ? ['**/*.spec.ts']
        : ['**/*.unit.spec.ts'],
};
