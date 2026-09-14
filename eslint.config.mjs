import js from '@eslint/js';

export default [
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  }
];
