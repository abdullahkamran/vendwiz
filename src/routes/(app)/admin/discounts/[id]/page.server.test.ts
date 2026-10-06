/**
 * Tests for the edit-discount server action.
 *
 * The key test — "update" action exists, not reserved "default" — fails
 * against the pre-fix code because SvelteKit unconditionally throws
 * "Cannot use reserved action name 'default'" before any app code runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { db } from '$lib/server/db';
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

// ── Happy-path: update action calls db.update and throws 302 redirect ─────────

describe('edit discount page — update action happy path', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(db.query.stores.findFirst).mockResolvedValue(
			{ id: 'store-1' } as Awaited<ReturnType<typeof db.query.stores.findFirst>>
		);
		// No conflicting code for other records
		vi.mocked(db.query.discountCodes.findFirst).mockResolvedValue(undefined);

		const whereMock = vi.fn().mockResolvedValue(undefined);
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		vi.mocked(db.update).mockReturnValue(
			{ set: setMock } as unknown as ReturnType<typeof db.update>
		);
	});

	it('calls db.update and redirects (302) on valid input', async () => {
		const fd = new FormData();
		fd.append('code', 'EDIT10');
		fd.append('type', 'fixed');
		fd.append('value', '5');
		fd.append('isActive', 'on');

		const request = { formData: () => Promise.resolve(fd) } as unknown as Request;
		const locals = { user: { id: 'user-1' } } as App.Locals;
		const params = { id: 'discount-1' };

		await expect(
			actions.update({ request, locals, params } as Parameters<typeof actions.update>[0])
		).rejects.toMatchObject({ status: 302 });

		expect(vi.mocked(db.update)).toHaveBeenCalled();
	});

	it('returns fail(400) when a different discount already uses the code', async () => {
		// findFirst returns a record with a DIFFERENT id — signals duplicate
		vi.mocked(db.query.discountCodes.findFirst).mockResolvedValue(
			{ id: 'other-discount', code: 'EDIT10' } as Awaited<ReturnType<typeof db.query.discountCodes.findFirst>>
		);

		const fd = new FormData();
		fd.append('code', 'EDIT10');
		fd.append('type', 'fixed');
		fd.append('value', '5');

		const request = { formData: () => Promise.resolve(fd) } as unknown as Request;
		const locals = { user: { id: 'user-1' } } as App.Locals;
		const params = { id: 'discount-1' }; // different from 'other-discount'

		const result = await actions.update(
			{ request, locals, params } as Parameters<typeof actions.update>[0]
		);

		expect(result).toMatchObject({ status: 400 });
	});
});
