import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/native/**/*.native.ts'], testTimeout: 45000, hookTimeout: 30000, maxWorkers: 1 } });
