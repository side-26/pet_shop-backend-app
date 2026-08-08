// jest.config.js
export default {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testEnvironment: 'node',
  testMatch: [
    '**/src/entities/**/*.integration.test.js',
    '**/src/**/*.test.js',
  ],
  moduleNameMapper: {
    '^#configs/(.*)$': '<rootDir>/src/configs/$1',
    '^#utils/(.*)$': '<rootDir>/src/utils/$1',
    '^#middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^#entities/(.*)$': '<rootDir>/src/entities/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 60000, // 60 seconds to avoid timeouts
};
