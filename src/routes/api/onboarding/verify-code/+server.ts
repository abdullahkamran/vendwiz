import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { licenseKeys } from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { verifyCodeSchema } from '$lib/schemas/onboarding';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = verifyCodeSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: parsed.error.errors[0].message }, { status: 400 });
	}

	const { code } = parsed.data;

	// Must exist and not already be redeemed
	const license = await db.query.licenseKeys.findFirst({
		where: eq(licenseKeys.code, code)
	});

	if (!license) {
		return json({ error: 'Invalid license code' }, { status: 400 });
	}

	if (license.usedByStoreId) {
		return json({ error: 'This license code has already been used' }, { status: 400 });
	}

	return json({ valid: true });
};
