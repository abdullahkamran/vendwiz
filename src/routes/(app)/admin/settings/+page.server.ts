import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, STORE_THEMES, type StoreTheme } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { listCurrencies, findCurrency } from '$lib/server/currencies';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const store = await db.query.stores.findFirst({
		where: eq(stores.ownerId, locals.user!.id)
	});
	return { store: store!, currencies: await listCurrencies() };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const data = await request.formData();

		const name = (data.get('name') as string)?.trim();
		const description = (data.get('description') as string)?.trim() || null;
		const logoUrl = (data.get('logoUrl') as string)?.trim() || null;
		const faviconUrl = (data.get('faviconUrl') as string)?.trim() || null;
		const rawTheme = (data.get('theme') as string) || 'basic';
		const theme: StoreTheme = (STORE_THEMES as readonly string[]).includes(rawTheme)
			? (rawTheme as StoreTheme)
			: 'basic';
		const primaryColor = (data.get('primaryColor') as string)?.trim() || null;
		const accentColor = (data.get('accentColor') as string)?.trim() || null;
		const secondaryColor = (data.get('secondaryColor') as string)?.trim() || null;
		const seoTitle = (data.get('seoTitle') as string)?.trim() || null;
		const seoDescription = (data.get('seoDescription') as string)?.trim() || null;
		const currencyCode = (data.get('currencyCode') as string)?.trim() ?? '';

		if (!name || name.length < 1) {
			return fail(400, { error: 'Store name is required' });
		}

		const currency = await findCurrency(currencyCode);
		if (!currency) {
			return fail(400, { error: 'Please select a valid currency' });
		}

		const customTheme =
			theme === 'custom' && primaryColor
				? { primaryColor, accentColor, secondaryColor }
				: null;

		await db
			.update(stores)
			.set({
				name,
				description,
				logoUrl,
				faviconUrl,
				theme,
				customTheme,
				currencyCode: currency.code,
				currencySymbol: currency.symbol,
				seoTitle,
				seoDescription,
				updatedAt: new Date()
			})
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
