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
		const field = (name: string, max: number) => ((data.get(name) as string | null) ?? '').trim().slice(0, max) || null;

		const bankName = field('bankName', 100);
		const bankAccountTitle = field('bankAccountTitle', 100);
		const bankAccountNumber = field('bankAccountNumber', 50);
		const bankIban = field('bankIban', 50);
		const bankBranch = field('bankBranch', 100);

		// Either all three required details, or none (which turns bank transfer off for this store)
		const required = [bankName, bankAccountTitle, bankAccountNumber];
		const filled = required.filter(Boolean).length;
		const anyOther = !!(bankIban || bankBranch);
		if ((filled > 0 || anyOther) && filled < 3) {
			return fail(400, {
				error: 'Please fill in the bank name, account title and account number — or clear every field to offer cash on delivery only.'
			});
		}

		await db
			.update(stores)
			.set({ bankName, bankAccountTitle, bankAccountNumber, bankIban, bankBranch, updatedAt: new Date() })
			.where(eq(stores.ownerId, locals.user!.id));

		return { success: true };
	}
};
