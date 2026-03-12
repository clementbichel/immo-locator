module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-line'],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'no-trailing-spaces': 'error',
  },
  overrides: [
    {
      // Extension-specific: browser + webextensions env
      files: ['packages/extension/src/**/*.js'],
      env: {
        browser: true,
        webextensions: true,
      },
    },
    {
      // Test files
      files: ['**/tests/**/*.js', '**/*.test.js'],
      env: {
        node: true,
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        test: 'readonly',
      },
    },
    {
      // Build scripts
      files: ['**/scripts/**/*.js'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'coverage/', '*.min.js'],
};
