/**
 * product.fixture.ts
 *
 * Creates a product via the admin API before the test and deletes it in
 * teardown (yield pattern). Scenarios that need an isolated product use this.
 */

export type ProductFixtures = {
	productFixture: { id: string; title: string; slug: string };
};
