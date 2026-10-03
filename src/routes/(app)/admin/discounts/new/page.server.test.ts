/**
 * Tests for the new-discount server action.
 *
 * The key test — "create" action exists, not reserved "default" — fails
 * against the pre-fix code because SvelteKit unconditionally throws
 * "Cannot use reserved action name 'default'" before any app code runs,
 * and having `actions.default` in the export is what triggers it.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Module mocks (must be registered before the module under test is imported) ──

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			stores: { findFirst: vi.fn() },
			discountCodes: { findFirst: vi.fn() }
		},
		insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }))
	}
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { actions } from './+page.server';

// ── Action key tests ──────────────────────────────────────────────────────────

describe('new discount page — actions object', () => {
	it('exports a "create" named action', () => {
		// SvelteKit routes ?/create to this function. Without the rename the key
		// is "default" and every POST returns 500 before reaching app code.
		expect(actions).toHaveProperty('create');
	});

	it('does not export the reserved "default" action name', () => {
		// Having actions.default causes SvelteKit to throw:
		//   Error: Cannot use reserved action name "default"
		expect(actions).not.toHaveProperty('default');
	});

	it('"create" action is a function', () => {
		expect(typeof actions.create).toBe('function');
	});
});
