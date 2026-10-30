import type { RequestHandler } from '@sveltejs/kit';
import { assetLinks } from '$lib/android';

// Digital Asset Links for a store's optional Android app. Android checks this file on the
// storefront's own origin (<subdomain>.<root>), so it is only served on subdomain access; on the
// root domain or path-based access (/store/<slug>) there is no store origin to verify.
export const GET: RequestHandler = ({ locals }) => {
	const store = locals.isStorefront ? locals.store : null;
	const body = store?.androidAppEnabled
		? assetLinks(store.androidPackageName, store.androidCertFingerprints)
		: [];

	return new Response(JSON.stringify(body), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
