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

		const shippingFeeStr = data.get('shippingFee') as string;
		const freeShippingThresholdStr = data.get('freeShippingThreshold') as string;
		const taxRateStr = data.get('taxRate') as string;
		const taxLabel = (data.get('taxLabel') as string)?.trim() || 'Tax';

		const shippingFee = shippingFeeStr ? parseFloat(shippingFeeStr) : 0;
		const freeShippingThreshold = freeShippingThresholdStr ? parseFloat(freeShippingThresholdStr) : null;
		// Tax rate stored as decimal (e.g. 17% → 0.17)
		const taxRatePercent = taxRateStr ? parseFloat(taxRateStr) : 0;
		const taxRate = taxRatePercent / 100;

		await db
			.update(stores)
			.set({
				shippingFee: shippingFee.toFixed(2),
				freeShippingThreshold: freeShippingThreshold !== null ? freeShippingThreshold.toFixed(2) : null,
				taxRate: taxRate.toFixed(4),
				taxLabel,
				updatedAt: new Date()
			})
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
