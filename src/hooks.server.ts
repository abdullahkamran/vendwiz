import { auth } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// ── Auth hook ──────────────────────────────────────────────────────────────────
const authHook: Handle = async ({ event, resolve }) => {
	const sessionData = await auth.api.getSession({ headers: event.request.headers });

	event.locals.session = sessionData?.session ?? null;
	event.locals.user = sessionData?.user ?? null;

	// Handle auth API routes
	if (event.url.pathname.startsWith('/api/auth')) {
		return auth.handler(event.request);
	}

	return resolve(event);
};

// ── Multi-tenant subdomain hook ────────────────────────────────────────────────
const subdomainHook: Handle = async ({ event, resolve }) => {
	const host = event.request.headers.get('host') ?? '';
	const rootDomain = import.meta.env.VITE_ROOT_DOMAIN ?? 'vendwiz.com';

	// Strip port for local dev (e.g. mystore.localhost:5173)
	const hostWithoutPort = host.split(':')[0];

	// Default: not a storefront request
	event.locals.storefront = null;
	event.locals.isStorefront = false;
	event.locals.store = null;

	if (hostWithoutPort.endsWith(`.${rootDomain}`) || hostWithoutPort.endsWith('.localhost')) {
		// Extract subdomain
		const subdomain = hostWithoutPort.split('.')[0];

		if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
			// Look up the store
			const storeRow = await db.query.stores.findFirst({
				where: eq(stores.subdomain, subdomain),
				with: { owner: true }
			});

			event.locals.subdomain = subdomain;
			// Convenience aliases used by storefront routes
			event.locals.store = storeRow ?? null;
			event.locals.isStorefront = !!storeRow;
		}
	}

	return resolve(event);
};

// ── Admin store hook ───────────────────────────────────────────────────────────
// For requests that are NOT on a storefront subdomain but have an authenticated
// user, set locals.store to that user's own store so admin/API routes can use it.
const adminStoreHook: Handle = async ({ event, resolve }) => {
	if (!event.locals.isStorefront && event.locals.user && !event.locals.store) {
		const userStore = await db.query.stores.findFirst({
			where: eq(stores.ownerId, event.locals.user.id)
		});
		event.locals.store = userStore ?? null;
		event.locals.isStorefront = false;
	}
	return resolve(event);
};

export const handle = sequence(authHook, subdomainHook, adminStoreHook);
