import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { MEDIA_PATH } from '$lib/media';
import type { PageServerLoad, Actions } from './$types';

const MAX_SLIDES = 8;

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

		// Home page slideshow: sent as JSON by the slide editor. Only images this store uploaded to
		// its "slides" folder are accepted.
		let heroSlides: { imageUrl: string; title: string; description: string }[] = [];
		try {
			const raw = JSON.parse(String(data.get('heroSlides') ?? '[]'));
			if (!Array.isArray(raw)) throw new Error('not a list');
			heroSlides = raw.map((s) => ({
				imageUrl: String(s?.imageUrl ?? '').trim(),
				title: String(s?.title ?? '').trim().slice(0, 80),
				description: String(s?.description ?? '').trim().slice(0, 200)
			}));
		} catch {
			return fail(400, { error: 'Could not read the slideshow slides' });
		}
		if (heroSlides.length > MAX_SLIDES) {
			return fail(400, { error: `You can add up to ${MAX_SLIDES} slides` });
		}
		const storeId = locals.store?.id;
		if (heroSlides.some((s) => !storeId || !MEDIA_PATH.test(s.imageUrl) || !s.imageUrl.startsWith(`${storeId}/slides/`))) {
			return fail(400, { error: 'Every slide needs an uploaded image' });
		}

		await db
			.update(stores)
			.set({
				announcementEnabled,
				announcementText,
				announcementBg,
				announcementFg,
				heroSlides,
				updatedAt: new Date()
			})
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
