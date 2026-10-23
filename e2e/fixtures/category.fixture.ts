/**
 * category.fixture.ts
 *
 * Creates a category via the admin API before the test and deletes it in teardown.
 */

export type CategoryFixtures = {
	categoryFixture: { id: string; name: string; slug: string };
};
