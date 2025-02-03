module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'coverage/', 'expo-env.d.ts'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['server/**/*.mjs', '*.config.js', '.eslintrc.js'],
      env: { node: true },
      rules: { 'no-console': 'off' },
    },
  ],
};
