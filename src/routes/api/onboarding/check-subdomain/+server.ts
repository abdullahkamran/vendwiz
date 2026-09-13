import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { subdomainSchema } from '$lib/schemas/onboarding';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const q = url.searchParams.get('q') ?? '';
	const parsed = subdomainSchema.safeParse({ subdomain: q });

	if (!parsed.success) {
		return json({ available: false, error: parsed.error.errors[0].message });
	}

	const existing = await db.query.stores.findFirst({
		where: eq(stores.subdomain, parsed.data.subdomain)
	});

	return json({ available: !existing });
};
