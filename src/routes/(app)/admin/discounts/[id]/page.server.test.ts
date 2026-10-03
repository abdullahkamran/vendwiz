/**
 * Tests for the edit-discount server action.
 *
 * The key test — "update" action exists, not reserved "default" — fails
 * against the pre-fix code because SvelteKit unconditionally throws
 * "Cannot use reserved action name 'default'" before any app code runs.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Module mocks (must be registered before the module under test is imported) ──

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			stores: { findFirst: vi.fn() },
			discountCodes: { findFirst: vi.fn() }
		},
		update: vi.fn(() => ({
			set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
		}))
	}
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { actions } from './+page.server';

// ── Action key tests ──────────────────────────────────────────────────────────

describe('edit discount page — actions object', () => {
	it('exports an "update" named action', () => {
		// SvelteKit routes ?/update to this function. Without the rename the key
		// is "default" and every POST returns 500 before reaching app code.
		expect(actions).toHaveProperty('update');
	});

	it('does not export the reserved "default" action name', () => {
		// Having actions.default causes SvelteKit to throw:
		//   Error: Cannot use reserved action name "default"
		expect(actions).not.toHaveProperty('default');
	});

	it('"update" action is a function', () => {
		expect(typeof actions.update).toBe('function');
	});
});
