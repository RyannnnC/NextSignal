import { defineConfig } from 'vitest/config';

export default defineConfig({test:{include:['tests/native/**/*.import.ts'],testTimeout:45000,hookTimeout:30000,maxWorkers:1}});
