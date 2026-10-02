/**
 * Unit tests for the admin navigation utilities (admin-nav.ts).
 *
 * The makeNavOnClick tests in particular cover the behaviour introduced in the
 * layout change that wired each nav link with `onclick={() => (sidebarOpen =
 * false)}`.  Without that extraction (and the underlying sidebar-close logic)
 * these tests cannot be imported and will fail.
 */
import { describe, it, expect } from 'vitest';
import { isActive, makeNavOnClick, navItems } from './admin-nav';

// ─── isActive ────────────────────────────────────────────────────────────────

describe('isActive', () => {
	it('matches /admin exactly — the dashboard does not activate for sub-pages', () => {
		expect(isActive('/admin', '/admin')).toBe(true);
		expect(isActive('/admin', '/admin/products')).toBe(false);
	});

	it('activates a non-root route when pathname starts with that href', () => {
		expect(isActive('/admin/products', '/admin/products')).toBe(true);
		expect(isActive('/admin/products', '/admin/products/new')).toBe(true);
	});

	it('does not activate for a sibling section', () => {
		expect(isActive('/admin/products', '/admin/categories')).toBe(false);
		expect(isActive('/admin/orders', '/admin/discounts')).toBe(false);
	});

	it('does not activate the dashboard for arbitrary sub-paths', () => {
		expect(isActive('/admin', '/admin/settings')).toBe(false);
	});
});

// ─── makeNavOnClick ───────────────────────────────────────────────────────────

describe('makeNavOnClick', () => {
	it('returns a handler that closes the sidebar when invoked', () => {
		let sidebarOpen = true;
		const handler = makeNavOnClick((v) => {
			sidebarOpen = v;
		});

		handler();

		expect(sidebarOpen).toBe(false);
	});

	it('does not close the sidebar until the returned handler is actually called', () => {
		let sidebarOpen = true;
		// Build the handler but do NOT call it yet.
		makeNavOnClick((v) => {
			sidebarOpen = v;
		});

		expect(sidebarOpen).toBe(true); // sidebar is still open
	});

	it('is safe to call when the sidebar is already closed (idempotent)', () => {
		let sidebarOpen = false;
		const handler = makeNavOnClick((v) => {
			sidebarOpen = v;
		});

		handler();

		expect(sidebarOpen).toBe(false);
	});

	it('each nav item gets an independent handler that closes the same sidebar', () => {
		// Simulates the layout rendering one handler per navItem.
		let sidebarOpen = true;
		const handlers = navItems.map(() =>
			makeNavOnClick((v) => {
				sidebarOpen = v;
			})
		);

		// Click the first handler — sidebar should close.
		handlers[0]();
		expect(sidebarOpen).toBe(false);

		sidebarOpen = true;
		// Click the last handler — same result.
		handlers[handlers.length - 1]();
		expect(sidebarOpen).toBe(false);
	});
});

// ─── navItems ─────────────────────────────────────────────────────────────────

describe('navItems', () => {
	it('contains at least one entry', () => {
		expect(navItems.length).toBeGreaterThan(0);
	});

	it('every item carries an href, label, and icon', () => {
		for (const item of navItems) {
			expect(typeof item.href).toBe('string');
			expect(typeof item.label).toBe('string');
			expect(typeof item.icon).toBe('string');
		}
	});

	it('all hrefs are rooted under /admin', () => {
		for (const item of navItems) {
			expect(item.href.startsWith('/admin')).toBe(true);
		}
	});
});
