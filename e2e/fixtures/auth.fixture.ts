/**
 * auth.fixture.ts
 *
 * adminPage  — a Page pre-authenticated as the E2E admin user via storageState.
 * customerPage — a clean Page with no session.
 */

export type AuthFixtures = {
	/** Marker: this page was set up with admin storageState. */
	adminPage: boolean;
	/** Marker: clean (unauthenticated) page. */
	customerPage: boolean;
};
