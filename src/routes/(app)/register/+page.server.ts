import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		// Check if the user already has an active store
		const store = await db.query.stores.findFirst({
			where: eq(stores.ownerId, locals.user.id)
		});

		redirect(302, store?.isActive ? '/admin' : '/onboarding');
	}

	return {};
};
