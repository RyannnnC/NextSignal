import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/next-env.d.ts', '.local/**', 'artifacts/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly' } } },
  { files: ['packages/domain/**/*.ts'], rules: { 'no-restricted-imports': ['error', { patterns: ['next*', '@electric-sql/*', '@nextsignal/adapters*', '@nextsignal/application*'] }] } }
);
