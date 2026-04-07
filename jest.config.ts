import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    // Resolve src/* imports from tests
  },
  // Silence pino logs during tests
  setupFiles: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/middleware/**/*.ts',
    '!src/generated/**',
  ],
  clearMocks: true,
};

export default config;
