import { defineBddConfig } from 'playwright-bdd';

/**
 * BDD configuration for playwright-bdd.
 *
 * Run `pnpm exec bddgen` to regenerate .features-gen/, then
 * `pnpm exec playwright test` to execute.
 *
 * `importTestFrom` ensures generated specs import our custom `test` instance
 * (with extended fixtures and Before hooks) rather than bare @playwright/test.
 */
export const bddOutput = defineBddConfig({
	features: 'e2e/features/**/*.feature',
	steps: ['e2e/steps/**/*.ts', 'e2e/fixtures/index.ts'],
	importTestFrom: 'e2e/fixtures/index.ts',
});
