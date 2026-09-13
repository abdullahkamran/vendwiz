import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user!.id)
	});
	return { store: store! };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const data = await request.formData();

		const whatsapp = (data.get('whatsapp') as string)?.trim() || null;
		const instagram = (data.get('instagram') as string)?.trim() || null;
		const facebook = (data.get('facebook') as string)?.trim() || null;
		const contactEmail = (data.get('contactEmail') as string)?.trim() || null;
		const contactPhone = (data.get('contactPhone') as string)?.trim() || null;

		// Basic validation for WhatsApp number
		if (whatsapp && !/^\+?[0-9\s\-()]{7,20}$/.test(whatsapp)) {
			return fail(400, { error: 'Invalid WhatsApp number format' });
		}

		await db
			.update(stores)
			.set({
				whatsapp,
				instagram,
				facebook,
				contactEmail,
				contactPhone,
				updatedAt: new Date()
			})
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
