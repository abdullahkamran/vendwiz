import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { storePolicies } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

const VALID_TYPES = ['return', 'shipping', 'terms', 'faq'] as const;
type PolicyType = (typeof VALID_TYPES)[number];

export const load: PageServerLoad = async ({ locals, params }) => {
  const type = params.type as PolicyType;

  if (!VALID_TYPES.includes(type)) {
    throw error(404, 'Policy not found');
  }

  const [policy] = await db
    .select()
    .from(storePolicies)
    .where(and(eq(storePolicies.storeId, locals.store!.id), eq(storePolicies.type, type)))
    .limit(1);

  if (!policy || !policy.content) {
    throw error(404, 'Policy not found');
  }

  const titles: Record<PolicyType, string> = {
    return: 'Return Policy',
    shipping: 'Shipping Info',
    terms: 'Terms & Conditions',
    faq: 'FAQ'
  };

  return { policy, title: titles[type] };
};
