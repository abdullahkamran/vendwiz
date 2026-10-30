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

		// "Our Stores": parallel name / map-link fields, one pair per row. Fully blank rows are skipped.
		// The map link is optional; without one the store is listed but not clickable.
		const names = data.getAll('locationName').map((v) => String(v).trim());
		const mapUrls = data.getAll('locationMapUrl').map((v) => String(v).trim());
		const storeLocations: { name: string; mapUrl: string }[] = [];
		for (let i = 0; i < Math.max(names.length, mapUrls.length); i++) {
			const name = names[i] ?? '';
			const mapUrl = mapUrls[i] ?? '';
			if (!name && !mapUrl) continue;
			if (!name) {
				return fail(400, { error: 'Each store needs a name' });
			}
			if (mapUrl && !/^https?:\/\/\S+$/i.test(mapUrl)) {
				return fail(400, { error: `Map link for "${name}" must start with https://` });
			}
			storeLocations.push({ name: name.slice(0, 100), mapUrl });
		}
		if (storeLocations.length > 20) {
			return fail(400, { error: 'You can list up to 20 stores' });
		}

		await db
			.update(stores)
			.set({
				whatsapp,
				instagram,
				facebook,
				contactEmail,
				contactPhone,
				storeLocations,
				updatedAt: new Date()
			})
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
