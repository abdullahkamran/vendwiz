import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
		user: locals.user,
		// The store's own favicon (set in Store Settings) when this request is for a storefront
		faviconUrl: locals.store?.faviconUrl ?? null
	};
};
