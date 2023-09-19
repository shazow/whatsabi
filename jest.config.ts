export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ // Defaults + fixture negation
    "**/__tests__/**/(*.)+(spec|test).[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
    "!**/__fixtures__/**",
  ],
  moduleNameMapper: {
    "^(\\.\\.?\\/.+)\\.js$": "$1",
  },
};
