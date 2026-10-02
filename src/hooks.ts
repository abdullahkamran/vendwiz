import type { Reroute } from '@sveltejs/kit';

// Sub-paths under /store/<slug>/ that must never be rerouted.
// Rerouting /store/<victim>/admin/... would route the request to the real
// admin handler while subdomainHook injects victim's store into locals —
// a cross-tenant IDOR.  Return undefined so SvelteKit keeps the original
// path and returns a 404 (no matching route exists).
const STOREFRONT_BLOCKED_PREFIXES = ['/admin', '/api'];

export const reroute: Reroute = ({ url }) => {
	const match = url.pathname.match(/^\/store\/([^/]+)(\/.*)?$/);
	if (!match) return;

	const subPath = match[2] || '/';

	// Never reroute admin or API paths through the /store/<slug> prefix.
	if (STOREFRONT_BLOCKED_PREFIXES.some((p) => subPath === p || subPath.startsWith(p + '/'))) {
		return;
	}

	return subPath;
};
