/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  testMatch: ['**/*.test.ts'],
  coverageReporters: ['html'],
  coverageDirectory: './docs/coverage',
}
