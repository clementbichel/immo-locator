import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.js',
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.js'],
      environment: 'node',
    },
  },
  {
    extends: './vitest.config.js',
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.js'],
      environment: 'jsdom',
      setupFiles: ['./tests/mocks/chrome-api.js'],
    },
  },
  {
    extends: './vitest.config.js',
    test: {
      name: 'e2e',
      include: ['tests/e2e/**/*.test.js'],
      environment: 'jsdom',
    },
  },
]);
