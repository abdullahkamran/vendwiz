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

		const announcementEnabled = data.get('announcementEnabled') === 'on';
		const announcementText = (data.get('announcementText') as string)?.trim().slice(0, 200) || null;
		const announcementBg = (data.get('announcementBg') as string)?.trim() || '#1a1a2e';
		const announcementFg = (data.get('announcementFg') as string)?.trim() || '#ffffff';

		await db
			.update(stores)
			.set({
				announcementEnabled,
				announcementText,
				announcementBg,
				announcementFg,
				updatedAt: new Date()
			})
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
