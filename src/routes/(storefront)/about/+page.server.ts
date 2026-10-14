import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { storePolicies } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { renderMarkdown } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.store) throw error(404, 'Store not found');

  const [about] = await db
    .select()
    .from(storePolicies)
    .where(and(eq(storePolicies.storeId, locals.store.id), eq(storePolicies.type, 'about')))
    .limit(1);

  // The link is always in the nav; until the owner writes the page, show a friendly placeholder
  const hasContent = !!about?.content?.trim();
  return {
    title: about?.title?.trim() || 'About Us',
    // Markdown → HTML on the server (raw HTML in the content is escaped)
    html: hasContent ? renderMarkdown(about!.content) : null
  };
};
