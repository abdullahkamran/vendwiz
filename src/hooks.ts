import type { Reroute } from '@sveltejs/kit';

// Sub-paths under /store/<slug>/ that must never be rerouted.
// Rerouting /store/<victim>/admin/... would route the request to the real
// admin handler while subdomainHook injects victim's store into locals —
// a cross-tenant IDOR.  Only block admin surfaces; storefront API paths
// (/api/storefront/*) are intentionally rerouted so the server hook can
// resolve locals.store from the slug in the original URL.
const STOREFRONT_BLOCKED_PREFIXES = ['/admin', '/api/admin'];

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
