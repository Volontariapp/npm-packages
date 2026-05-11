import config from '@volontariapp/eslint-config';

export default [
  {
    files: ['src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
    },
  },
  ...config,
];
