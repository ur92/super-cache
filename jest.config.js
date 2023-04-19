/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "**/src/**/*.(spec|test|e2e).ts",
    "**/test/**/*.(spec|test|e2e).ts",
  ]
};