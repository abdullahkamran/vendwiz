import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Must be authenticated
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Must have an active store
	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user.id)
	});

	if (!store || !store.isActive) {
		throw redirect(302, '/onboarding');
	}

	return {
		store,
		user: locals.user
	};
};
