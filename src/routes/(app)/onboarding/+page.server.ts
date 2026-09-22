import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, licenseKeys } from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { saveImage } from '$lib/server/storage/upload';
import { createStoreSchema } from '$lib/schemas/onboarding';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Already completed onboarding → go to admin
	const existing = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user.id)
	});

	if (existing?.isActive) {
		redirect(302, '/admin');
	}

	return {};
};

export const actions: Actions = {
	createStore: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();

		const raw = {
			licenseCode: formData.get('licenseCode') as string,
			subdomain: formData.get('subdomain') as string,
			name: formData.get('name') as string,
			description: (formData.get('description') as string) || undefined,
			theme: (formData.get('theme') as string) || 'basic'
		};

		const parsed = createStoreSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0].message });
		}

		const { licenseCode, subdomain, name, description, theme } = parsed.data;

		// Re-verify license code server-side
		const license = await db.query.licenseKeys.findFirst({
			where: eq(licenseKeys.code, licenseCode)
		});

		if (!license || license.usedByStoreId) {
			return fail(400, { error: 'Invalid or already used license code' });
		}

		// Re-verify subdomain uniqueness
		const subdomainTaken = await db.query.stores.findFirst({
			where: eq(stores.subdomain, subdomain)
		});

		if (subdomainTaken) {
			return fail(400, { error: 'That subdomain is no longer available' });
		}

		// Handle optional file uploads
		let logoUrl: string | null = null;
		let faviconUrl: string | null = null;

		const logoFile = formData.get('logo') as File | null;
		if (logoFile && logoFile.size > 0) {
			try {
				const buffer = Buffer.from(await logoFile.arrayBuffer());
				logoUrl = await saveImage(buffer, 'logos', { width: 400, height: 400 });
			} catch {
				// Non-fatal: proceed without logo
			}
		}

		const faviconFile = formData.get('favicon') as File | null;
		if (faviconFile && faviconFile.size > 0) {
			try {
				const buffer = Buffer.from(await faviconFile.arrayBuffer());
				faviconUrl = await saveImage(buffer, 'favicons', { width: 64, height: 64 });
			} catch {
				// Non-fatal: proceed without favicon
			}
		}

		// Create store
		const storeId = nanoid();

		await db.insert(stores).values({
			id: storeId,
			ownerId: locals.user.id,
			subdomain,
			name,
			description: description ?? null,
			theme,
			logoUrl,
			faviconUrl,
			isActive: true,
			verificationCode: licenseCode
		});

		// Consume the license key
		await db
			.update(licenseKeys)
			.set({ usedByStoreId: storeId, usedAt: new Date() })
			.where(eq(licenseKeys.id, license.id));

		redirect(302, '/admin');
	}
};
