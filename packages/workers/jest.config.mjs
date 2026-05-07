/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
  testMatch: ['**/*.unit.spec.ts'],
};
