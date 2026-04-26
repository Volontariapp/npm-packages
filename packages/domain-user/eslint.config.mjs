import config from '@volontariapp/eslint-config';

export default [
  ...config,
  {
    // jest mocks require accessing unbound methods for expect().toHaveBeenCalled() assertions
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
];
