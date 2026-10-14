/**
 * discount.fixture.ts
 *
 * Creates a discount before the test and deletes it in teardown.
 * Because discounts are managed via SvelteKit form actions (no REST API),
 * the implementation in index.ts interacts with the UI.
 */

export type DiscountFixtures = {
	discountFixture: { id: string; code: string };
};
