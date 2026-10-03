import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storePolicies } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { renderMarkdown } from '$lib/server/markdown';

const VALID_TYPES = ['return', 'shipping', 'terms', 'faq'] as const;

/** Maps URL slugs to their canonical DB type values where they differ. */
const TYPE_ALIAS: Partial<Record<string, string>> = { return: 'return_refund' };

export const GET: RequestHandler = async ({ params }) => {
	const { storeId, type } = params;

	if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
		throw error(404, 'Policy not found');
	}

	const [policy] = await db
		.select()
		.from(storePolicies)
		.where(
			and(
				eq(storePolicies.storeId, storeId!),
				eq(storePolicies.type, TYPE_ALIAS[type!] ?? type!)
			)
		)
		.limit(1);

	if (!policy || !policy.content) {
		throw error(404, 'Policy not found');
	}

	const html = renderMarkdown(policy.content);

	return json({ policy, html });
};
