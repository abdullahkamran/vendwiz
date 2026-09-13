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

	if (hostWithoutPort.endsWith(`.${rootDomain}`) || hostWithoutPort.endsWith('.localhost')) {
		// Extract subdomain
		const subdomain = hostWithoutPort.split('.')[0];

		if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
			// Look up the store
			const store = await db.query.stores.findFirst({
				where: eq(stores.subdomain, subdomain),
				with: { owner: true }
			});

			event.locals.storefront = store ?? null;
			event.locals.subdomain = subdomain;
		}
	}

	return resolve(event);
};

export const handle = sequence(authHook, subdomainHook);
