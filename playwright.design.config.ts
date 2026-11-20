import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';

export default defineConfig({ ...auth, testIgnore: [], testMatch: '**/design-review.spec.ts' });
