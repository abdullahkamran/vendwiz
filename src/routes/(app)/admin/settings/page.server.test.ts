/**
 * Tests that the settings page server update action reads and persists currencySymbol.
 *
 * These tests FAIL against the pre-change code because the old action did not
 * read or persist the currencySymbol field from form data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted before imports) ────────────────────────────────────

vi.mock('$lib/server/db', () => ({
	db: {
		query: { stores: { findFirst: vi.fn() } },
		update: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/db/schema')>();
	return { ...actual };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { db } from '$lib/server/db';
import { actions } from './+page.server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal Drizzle update chain mock and return the `set` spy. */
function mockUpdateChain() {
	const whereMock = vi.fn().mockResolvedValue(undefined);
	const setMock = vi.fn().mockReturnValue({ where: whereMock });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	vi.mocked(db.update).mockReturnValue({ set: setMock } as unknown as ReturnType<typeof db.update>);
	return { setMock, whereMock };
}

function makeRequest(fields: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

const mockLocals = { user: { id: 'user-1' } } as App.Locals;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('settings update action — currencySymbol', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes currencySymbol from form data to the database update', async () => {
		const { setMock } = mockUpdateChain();

		await actions.update({
			request: makeRequest({
				name: 'Test Store',
				currencySymbol: '$'
			}),
			locals: mockLocals
		} as Parameters<typeof actions.update>[0]);

		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ currencySymbol: '$' })
		);
	});

	it('defaults currencySymbol to "Rs." when the field is absent', async () => {
		const { setMock } = mockUpdateChain();

		await actions.update({
			request: makeRequest({ name: 'Test Store' }),
			locals: mockLocals
		} as Parameters<typeof actions.update>[0]);

		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ currencySymbol: 'Rs.' })
		);
	});
});
