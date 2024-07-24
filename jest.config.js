module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  testMatch: ['*/app/lib/*.test.ts'],
  coverageReporters: ['html'],
  coverageDirectory: './docs/coverage',
}
