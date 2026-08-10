// jest.unit.config.js
export default {
  testEnvironment: 'node',
  testMatch: ['**/*.unit.test.js'],
  moduleNameMapper: {
    '^#configs/(.*)$': '<rootDir>/src/configs/$1',
    '^#utils/(.*)$': '<rootDir>/src/utils/$1',
    '^#middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^#services/(.*)$': '<rootDir>/src/services/$1',
    '^#entities/(.*)$': '<rootDir>/src/entities/$1',
  },
  // No setupFilesAfterEnv
};
