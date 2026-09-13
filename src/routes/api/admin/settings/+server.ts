import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { InferSelectModel } from 'drizzle-orm';

type StoreUpdate = Partial<
	Pick<
		InferSelectModel<typeof stores>,
		| 'name'
		| 'description'
		| 'logoUrl'
		| 'faviconUrl'
		| 'theme'
		| 'customTheme'
		| 'whatsapp'
		| 'instagram'
		| 'facebook'
		| 'contactEmail'
		| 'contactPhone'
		| 'announcementEnabled'
		| 'announcementText'
		| 'announcementBg'
		| 'announcementFg'
		| 'shippingFee'
		| 'freeShippingThreshold'
		| 'taxRate'
		| 'taxLabel'
		| 'seoTitle'
		| 'seoDescription'
	>
> & { updatedAt?: Date };

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user.id)
	});

	if (!store) {
		throw error(404, 'Store not found');
	}

	const updates: StoreUpdate = {};

	if (typeof body.name === 'string') updates.name = body.name;
	if ('description' in body) updates.description = body.description as string | null;
	if ('logoUrl' in body) updates.logoUrl = body.logoUrl as string | null;
	if ('faviconUrl' in body) updates.faviconUrl = body.faviconUrl as string | null;
	if (typeof body.theme === 'string') updates.theme = body.theme;
	if ('customTheme' in body) updates.customTheme = body.customTheme;
	if ('whatsapp' in body) updates.whatsapp = body.whatsapp as string | null;
	if ('instagram' in body) updates.instagram = body.instagram as string | null;
	if ('facebook' in body) updates.facebook = body.facebook as string | null;
	if ('contactEmail' in body) updates.contactEmail = body.contactEmail as string | null;
	if ('contactPhone' in body) updates.contactPhone = body.contactPhone as string | null;
	if (typeof body.announcementEnabled === 'boolean') updates.announcementEnabled = body.announcementEnabled;
	if ('announcementText' in body) updates.announcementText = body.announcementText as string | null;
	if ('announcementBg' in body) updates.announcementBg = body.announcementBg as string | null;
	if ('announcementFg' in body) updates.announcementFg = body.announcementFg as string | null;
	if (typeof body.shippingFee === 'string') updates.shippingFee = body.shippingFee;
	if ('freeShippingThreshold' in body) updates.freeShippingThreshold = body.freeShippingThreshold as string | null;
	if (typeof body.taxRate === 'string') updates.taxRate = body.taxRate;
	if ('taxLabel' in body) updates.taxLabel = body.taxLabel as string | null;
	if ('seoTitle' in body) updates.seoTitle = body.seoTitle as string | null;
	if ('seoDescription' in body) updates.seoDescription = body.seoDescription as string | null;

	if (Object.keys(updates).length === 0) {
		throw error(400, 'No valid fields to update');
	}

	updates.updatedAt = new Date();

	await db.update(stores).set(updates).where(eq(stores.id, store.id));

	const updated = await db.query.stores.findFirst({
		where: eq(stores.id, store.id)
	});

	return json({ store: updated });
};
