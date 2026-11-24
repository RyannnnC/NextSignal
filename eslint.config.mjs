import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: [
    '**/node_modules/**', '**/.next/**', '**/.next-e2e/**', '**/next-env.d.ts', '.local/**',
    'artifacts/**', 'test-results/**', 'playwright-report/**',
    // Bundled Impeccable tool code is maintained upstream.
    '.agents/skills/impeccable/scripts/**', '.github/skills/impeccable/scripts/**',
  ] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly' } } },
  { files: ['packages/domain/**/*.ts'], rules: { 'no-restricted-imports': ['error', { patterns: ['next*', '@electric-sql/*', '@nextsignal/adapters*', '@nextsignal/application*'] }] } }
);
