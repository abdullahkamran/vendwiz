/**
 * Admin navigation utilities shared by +layout.svelte.
 *
 * Extracted as a plain TypeScript module so the key behaviours — active-link
 * detection and the sidebar-close handler — can be unit tested without a DOM
 * environment.
 */

export const navItems = [
	{ href: '/admin', label: 'Dashboard', icon: '⊞' },
	{ href: '/admin/products', label: 'Products', icon: '📦' },
	{ href: '/admin/categories', label: 'Categories', icon: '🗂️' },
	{ href: '/admin/orders', label: 'Orders', icon: '🛒' },
	{ href: '/admin/discounts', label: 'Discounts', icon: '🏷️' },
	{ href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
	{ href: '/admin/shipping', label: 'Shipping & Tax', icon: '🚚' },
	{ href: '/admin/settings', label: 'Settings', icon: '⚙️' },
	{ href: '/admin/account', label: 'Account', icon: '👤' }
] as const;

/**
 * Returns true when `pathname` matches the given nav `href`.
 *
 * The dashboard root (`/admin`) requires an exact match so it does not light
 * up for every admin sub-page.  All other entries use a prefix match so that
 * nested pages (e.g. `/admin/products/new`) still highlight the correct item.
 */
export function isActive(href: string, pathname: string): boolean {
	if (href === '/admin') return pathname === '/admin';
	return pathname.startsWith(href);
}

/**
 * Returns an onclick handler for admin nav links that closes the mobile
 * sidebar.
 *
 * The returned function, when invoked, calls `setSidebarOpen(false)` so the
 * slide-in sidebar collapses immediately after the user taps a link on a
 * small screen.
 */
export function makeNavOnClick(setSidebarOpen: (open: boolean) => void): () => void {
	return () => setSidebarOpen(false);
}
