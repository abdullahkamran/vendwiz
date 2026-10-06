/**
 * Tests for the new-discount server action.
 *
 * The key test — "create" action exists, not reserved "default" — fails
 * against the pre-fix code because SvelteKit unconditionally throws
 * "Cannot use reserved action name 'default'" before any app code runs,
 * and having `actions.default` in the export is what triggers it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { db } from '$lib/server/db';
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

// ── Happy-path: create action calls db.insert and throws 302 redirect ─────────

describe('new discount page — create action happy path', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(db.query.stores.findFirst).mockResolvedValue(
			{ id: 'store-1' } as Awaited<ReturnType<typeof db.query.stores.findFirst>>
		);
		vi.mocked(db.query.discountCodes.findFirst).mockResolvedValue(undefined);
		vi.mocked(db.insert).mockReturnValue(
			{ values: vi.fn().mockResolvedValue(undefined) } as unknown as ReturnType<typeof db.insert>
		);
	});

	it('calls db.insert and redirects (302) on valid input', async () => {
		const fd = new FormData();
		fd.append('code', 'SAVE10');
		fd.append('type', 'percentage');
		fd.append('value', '10');
		fd.append('isActive', 'on');

		const request = { formData: () => Promise.resolve(fd) } as unknown as Request;
		const locals = { user: { id: 'user-1' } } as App.Locals;

		await expect(
			actions.create({ request, locals } as Parameters<typeof actions.create>[0])
		).rejects.toMatchObject({ status: 302 });

		expect(vi.mocked(db.insert)).toHaveBeenCalled();
	});

	it('returns fail(400) when the discount code already exists', async () => {
		vi.mocked(db.query.discountCodes.findFirst).mockResolvedValue(
			{ id: 'existing-1', code: 'SAVE10' } as Awaited<ReturnType<typeof db.query.discountCodes.findFirst>>
		);

		const fd = new FormData();
		fd.append('code', 'SAVE10');
		fd.append('type', 'percentage');
		fd.append('value', '10');

		const request = { formData: () => Promise.resolve(fd) } as unknown as Request;
		const locals = { user: { id: 'user-1' } } as App.Locals;

		const result = await actions.create(
			{ request, locals } as Parameters<typeof actions.create>[0]
		);

		expect(result).toMatchObject({ status: 400 });
	});
});
