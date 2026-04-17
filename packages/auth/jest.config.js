/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@volontariapp/(.*)$': '<rootDir>/../$1/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/', '/src/test/'],
  testMatch: ['**/*.int.spec.ts', '**/*.unit.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
